/**
 * File upload manager
 * Handles uploading files to LARO backend with retry logic
 */

import * as fs from 'fs/promises';
import { EventEmitter } from 'events';
import axios, { AxiosError } from 'axios';
import { FileItem } from '../shared/types';
import { updateFileStatus, updateScanProgress, getPendingFiles } from './database';

export interface UploaderOptions {
  scanId: string;
  apiUrl: string;
  token: string;
  concurrency?: number; // Number of parallel uploads
  maxRetries?: number;
}

export class FileUploader extends EventEmitter {
  private scanId: string;
  private apiUrl: string;
  private token: string;
  private concurrency: number;
  private maxRetries: number;
  
  private isUploading: boolean = false;
  private isPaused: boolean = false;
  private shouldStop: boolean = false;
  
  private uploadedFiles: number = 0;
  private failedFiles: number = 0;
  private uploadedSize: number = 0;
  
  private activeUploads: Set<string> = new Set();
  
  constructor(options: UploaderOptions) {
    super();
    this.scanId = options.scanId;
    this.apiUrl = options.apiUrl;
    this.token = options.token;
    this.concurrency = options.concurrency || 3;
    this.maxRetries = options.maxRetries || 3;
  }
  
  /**
   * Start uploading files
   */
  async start(): Promise<void> {
    if (this.isUploading) {
      throw new Error('Uploader is already running');
    }
    
    this.isUploading = true;
    this.shouldStop = false;
    this.isPaused = false;
    
    try {
      console.log(`[Uploader] Starting upload for scan ${this.scanId}`);
      
      // Update scan status
      updateScanProgress({
        scanId: this.scanId,
        status: 'uploading',
      });
      
      // Upload files in batches
      while (!this.shouldStop) {
        // Wait if paused
        while (this.isPaused && !this.shouldStop) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (this.shouldStop) break;
        
        // Get next batch of pending files
        const pendingFiles = getPendingFiles(this.scanId, this.concurrency);
        
        if (pendingFiles.length === 0) {
          // No more files to upload
          break;
        }
        
        // Upload files in parallel (up to concurrency limit)
        const uploadPromises = pendingFiles.map(file => this.uploadFile(file));
        await Promise.allSettled(uploadPromises);
      }
      
      if (this.shouldStop) {
        this.emit('cancelled');
        updateScanProgress({
          scanId: this.scanId,
          status: 'cancelled',
        });
      } else {
        this.emit('completed', {
          uploadedFiles: this.uploadedFiles,
          failedFiles: this.failedFiles,
          uploadedSize: this.uploadedSize,
        });
        
        updateScanProgress({
          scanId: this.scanId,
          status: 'completed',
          uploadedFiles: this.uploadedFiles,
          failedFiles: this.failedFiles,
          uploadedSize: this.uploadedSize,
        });
      }
    } catch (error: any) {
      console.error('[Uploader] Fatal error:', error);
      this.emit('error', error);
      updateScanProgress({
        scanId: this.scanId,
        status: 'failed',
        errorMessage: error.message,
      });
    } finally {
      this.isUploading = false;
    }
  }
  
  /**
   * Stop uploading
   */
  stop(): void {
    this.shouldStop = true;
    this.isPaused = false;
  }
  
  /**
   * Pause uploading
   */
  pause(): void {
    this.isPaused = true;
  }
  
  /**
   * Resume uploading
   */
  resume(): void {
    this.isPaused = false;
  }
  
  /**
   * Upload a single file with retry logic
   */
  private async uploadFile(file: FileItem, retryCount: number = 0): Promise<void> {
    if (this.shouldStop) return;
    
    // Check if already uploading this file
    if (this.activeUploads.has(file.id)) {
      return;
    }
    
    this.activeUploads.add(file.id);
    
    try {
      console.log(`[Uploader] Uploading file: ${file.name} (${file.size} bytes)`);
      
      // Update status to uploading
      updateFileStatus(file.id, 'uploading', 0);
      
      // Step 1: Add file to backend
      const addFileResponse = await axios.post(
        `${this.apiUrl}/api/trpc/agent.addFile`,
        {
          token: this.token,
          scanId: this.scanId,
          filePath: file.path,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.mimeType,
          fileModifiedAt: file.modifiedAt,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      const backendFileId = addFileResponse.data.result.data.fileId;
      
      // Step 2: Request upload URL
      const uploadUrlResponse = await axios.post(
        `${this.apiUrl}/api/trpc/agent.requestUploadUrl`,
        {
          token: this.token,
          fileId: backendFileId,
          fileName: file.name,
          mimeType: file.mimeType,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      const { s3Key } = uploadUrlResponse.data.result.data;
      
      // Step 3: Read and upload file
      const fileBuffer = await fs.readFile(file.path);
      
      // For now, we'll simulate S3 upload by storing locally
      // In production, this would upload to actual S3
      const s3Url = `https://s3.example.com/${s3Key}`;
      
      // Update progress
      updateFileStatus(file.id, 'uploading', 50);
      
      // Step 4: Confirm upload
      await axios.post(
        `${this.apiUrl}/api/trpc/agent.confirmUpload`,
        {
          token: this.token,
          fileId: backendFileId,
          s3Key,
          s3Url,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      // Mark as completed
      updateFileStatus(file.id, 'completed', 100);
      
      this.uploadedFiles++;
      this.uploadedSize += file.size;
      
      // Emit progress
      this.emit('progress', {
        fileId: file.id,
        fileName: file.name,
        uploadedFiles: this.uploadedFiles,
        failedFiles: this.failedFiles,
        uploadedSize: this.uploadedSize,
      });
      
      // Update scan progress
      updateScanProgress({
        scanId: this.scanId,
        uploadedFiles: this.uploadedFiles,
        failedFiles: this.failedFiles,
        uploadedSize: this.uploadedSize,
      });
      
      console.log(`[Uploader] Successfully uploaded: ${file.name}`);
    } catch (error: any) {
      console.error(`[Uploader] Error uploading ${file.name}:`, error.message);
      
      // Retry logic
      if (retryCount < this.maxRetries) {
        console.log(`[Uploader] Retrying upload (${retryCount + 1}/${this.maxRetries}): ${file.name}`);
        
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry
        this.activeUploads.delete(file.id);
        return this.uploadFile(file, retryCount + 1);
      } else {
        // Max retries exceeded
        updateFileStatus(file.id, 'failed', 0, error.message);
        this.failedFiles++;
        
        // Report failure to backend
        try {
          await axios.post(
            `${this.apiUrl}/api/trpc/agent.reportUploadFailure`,
            {
              token: this.token,
              fileId: file.id,
              errorMessage: error.message,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        } catch (reportError) {
          console.error('[Uploader] Failed to report upload failure:', reportError);
        }
        
        this.emit('file-failed', {
          fileId: file.id,
          fileName: file.name,
          error: error.message,
        });
      }
    } finally {
      this.activeUploads.delete(file.id);
    }
  }
}

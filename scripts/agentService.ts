  scanId: string,
  totalFiles: number,
  uploadedFiles: number,
  failedFiles: number,
  totalSizeBytes?: number,
  uploadedSizeBytes?: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const updateData: any = {
    totalFiles: totalFiles.toString(),
    uploadedFiles: uploadedFiles.toString(),
    failedFiles: failedFiles.toString(),
    updatedAt: new Date(),
  };

  if (totalSizeBytes !== undefined) {
    updateData.totalSizeBytes = totalSizeBytes.toString();
  }

  if (uploadedSizeBytes !== undefined) {
    updateData.uploadedSizeBytes = uploadedSizeBytes.toString();
  }

  await db
    .update(agentScans)
    .set(updateData)
    .where(eq(agentScans.id, scanId));
}

/**
 * Update scan status
 */
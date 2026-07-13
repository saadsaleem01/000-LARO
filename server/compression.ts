import { Request, Response, NextFunction } from "express";
import zlib from "zlib";

/**
 * Compression middleware for Express
 * Compresses responses using gzip or deflate based on Accept-Encoding header
 */
export function compressionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Skip compression for certain content types
  const skipCompression = [
    "image/",
    "video/",
    "audio/",
    "application/zip",
    "application/gzip",
  ];

  const originalSend = res.send;
  const originalJson = res.json;

  // Override res.send
  res.send = function (data: any): Response {
    // Mirror Express's default Content-Type inference BEFORE we turn the body
    // into a Buffer below. Express only defaults string bodies to text/html
    // when it does the sending; once we compress to a Buffer, originalSend
    // would instead default to application/octet-stream, which makes browsers
    // download the response (e.g. the OAuth callback HTML) instead of rendering it.
    if (typeof data === "string" && !res.getHeader("Content-Type")) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
    }

    const contentType = res.getHeader("Content-Type") as string || "";
    
    // Skip if already compressed or not compressible
    if (
      res.getHeader("Content-Encoding") ||
      skipCompression.some((type) => contentType.startsWith(type)) ||
      !shouldCompress(req, res, data)
    ) {
      return originalSend.call(this, data);
    }

    // Compress the data
    const compressed = compressData(data, req.headers["accept-encoding"] as string);
    
    if (compressed) {
      res.setHeader("Content-Encoding", compressed.encoding);
      res.setHeader("Vary", "Accept-Encoding");
      return originalSend.call(this, compressed.data);
    }

    return originalSend.call(this, data);
  };

  // Override res.json
  res.json = function (data: any): Response {
    const jsonString = JSON.stringify(data);
    
    if (!shouldCompress(req, res, jsonString)) {
      return originalJson.call(this, data);
    }

    const compressed = compressData(jsonString, req.headers["accept-encoding"] as string);
    
    if (compressed) {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Encoding", compressed.encoding);
      res.setHeader("Vary", "Accept-Encoding");
      return originalSend.call(this, compressed.data);
    }

    return originalJson.call(this, data);
  };

  next();
}

/**
 * Determine if response should be compressed
 */
function shouldCompress(req: Request, res: Response, data: any): boolean {
  // Don't compress if no Accept-Encoding header
  if (!req.headers["accept-encoding"]) {
    return false;
  }

  // Don't compress small responses (< 1KB)
  const size = Buffer.byteLength(
    typeof data === "string" ? data : JSON.stringify(data)
  );
  
  if (size < 1024) {
    return false;
  }

  // Don't compress if Cache-Control: no-transform
  const cacheControl = res.getHeader("Cache-Control") as string;
  if (cacheControl && cacheControl.includes("no-transform")) {
    return false;
  }

  return true;
}

/**
 * Compress data using gzip or deflate
 */
function compressData(
  data: any,
  acceptEncoding: string = ""
): { data: Buffer; encoding: string } | null {
  const dataBuffer = Buffer.isBuffer(data)
    ? data
    : Buffer.from(typeof data === "string" ? data : JSON.stringify(data));

  // Prefer gzip
  if (acceptEncoding.includes("gzip")) {
    return {
      data: zlib.gzipSync(dataBuffer, { level: 6 }),
      encoding: "gzip",
    };
  }

  // Fall back to deflate
  if (acceptEncoding.includes("deflate")) {
    return {
      data: zlib.deflateSync(dataBuffer, { level: 6 }),
      encoding: "deflate",
    };
  }

  // No supported encoding
  return null;
}

/**
 * Stream compression for large responses
 */
export function createCompressionStream(encoding: string): zlib.Gzip | zlib.Deflate | null {
  if (encoding.includes("gzip")) {
    return zlib.createGzip({ level: 6 });
  }

  if (encoding.includes("deflate")) {
    return zlib.createDeflate({ level: 6 });
  }

  return null;
}


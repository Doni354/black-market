import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary/config";
import type { UploadApiResponse } from "cloudinary";

export async function POST(request: NextRequest) {
  try {
    // 1. Read multipart form data (Public upload permitted for pre-order payment proofs and admin catalog)
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "noury/products";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate mime type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Limit size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image size cannot exceed 5MB" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary via stream
    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          transformation: [
            { width: 1200, height: 1200, crop: "limit", quality: "auto" },
          ],
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("Upload failed"));
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image. Please try again." },
      { status: 500 }
    );
  }
}

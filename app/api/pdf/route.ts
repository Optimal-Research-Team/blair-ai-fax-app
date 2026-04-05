import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  const bucket = request.nextUrl.searchParams.get('bucket')

  if (!key || !bucket) {
    return NextResponse.json({ error: 'Missing key or bucket' }, { status: 400 })
  }

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key })
    const response = await s3.send(command)

    const stream = response.Body as Readable
    const chunks: Uint8Array[] = []
    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array)
    }
    const buffer = Buffer.concat(chunks)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    console.error('PDF proxy error:', err)
    return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 500 })
  }
}

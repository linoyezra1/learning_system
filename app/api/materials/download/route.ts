import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

// Exact filename as provided - do not change
const HANDBOOK_FILENAME = 'חוברת לימוד עזרה ראשונה.pdf';

export async function GET(request: NextRequest) {
  try {
    const possiblePaths = [
      path.join(process.cwd(), 'public', HANDBOOK_FILENAME),
      path.join(process.cwd(), HANDBOOK_FILENAME),
    ];

    let filePath: string | null = null;
    for (const testPath of possiblePaths) {
      try {
        await readFile(testPath);
        filePath = testPath;
        break;
      } catch {
        continue;
      }
    }

    if (!filePath) {
      return NextResponse.json(
        { error: 'החוברת לא נמצאה. אנא הוסף את הקובץ "' + HANDBOOK_FILENAME + '" לתיקיית public/ או לשורש הפרויקט.' },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="' + HANDBOOK_FILENAME + '"',
      },
    });
  } catch (error) {
    console.error('Error downloading handbook:', error);
    return NextResponse.json(
      { error: 'שגיאה בהורדת החוברת' },
      { status: 500 }
    );
  }
}




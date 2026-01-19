import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Try multiple possible locations for the handbook
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'חוברת 44 מעודכן 04.01.pdf'),
      path.join(process.cwd(), 'public', 'uploads', 'חוברת 44 מעודכן 04.01.pdf'),
      path.join(process.cwd(), 'public', 'handbook.pdf'),
      path.join(process.cwd(), 'חוברת 44 מעודכן 04.01.pdf'),
      path.join(process.cwd(), 'public', 'uploads', 'handbook.pdf'),
    ];

    let filePath: string | null = null;
    let found = false;

    for (const testPath of possiblePaths) {
      try {
        await readFile(testPath);
        filePath = testPath;
        found = true;
        break;
      } catch (error) {
        // File not found at this location, try next
        continue;
      }
    }

    if (!found) {
      return NextResponse.json(
        { error: 'החוברת לא נמצאה. אנא הוסף את הקובץ "חוברת 44 מעודכן 04.01.pdf" לתיקיית public/' },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = await readFile(filePath!);

    // Return as PDF download
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="חוברת 44 מעודכן 04.01.pdf"',
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




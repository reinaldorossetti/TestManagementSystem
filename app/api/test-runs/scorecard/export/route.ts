import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, handleRoute } from '@/src/server/http/responses';
import {
  requireTestRunSessionUser,
  testRunService,
} from '@/src/server/services/testRunService';
import {
  generateScorecardPdfBuffer,
  generateScorecardXlsxBuffer,
} from '@/src/utils/testRunScorecardExporter';
import { parseScorecardSearchParams } from '../route';

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requireTestRunSessionUser(request);
    if (user.role !== 'analyst' && user.role !== 'admin') {
      throw new ApiError(
        'Acesso negado: Apenas usuários analyst ou admin podem exportar o scorecard.',
        403,
      );
    }

    const format = request.nextUrl.searchParams.get('format')?.trim().toLowerCase();
    if (format !== 'xlsx' && format !== 'pdf') {
      throw new ApiError(
        'Formato inválido. Informe format=xlsx ou format=pdf.',
        400,
        { field: 'format' },
      );
    }

    const query = parseScorecardSearchParams(request.nextUrl.searchParams);
    const { scorecard, matchingRuns } = await testRunService.getScorecardData(query);

    if (scorecard.runs.length === 0) {
      throw new ApiError(
        'Nenhum Test Run encontrado para exportação com os filtros selecionados.',
        400,
      );
    }

    if (format === 'xlsx') {
      const xlsxBuffer = await generateScorecardXlsxBuffer(scorecard, matchingRuns);
      return new NextResponse(new Uint8Array(xlsxBuffer), {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="test-runs-scorecard.xlsx"',
          'Content-Length': String(xlsxBuffer.byteLength),
        },
      });
    }

    const pdfBuffer = generateScorecardPdfBuffer(scorecard);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test-runs-scorecard.pdf"',
        'Content-Length': String(pdfBuffer.byteLength),
      },
    });
  });
}


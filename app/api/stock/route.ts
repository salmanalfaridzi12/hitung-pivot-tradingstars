import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json({ error: 'Kode saham harus diisi' }, { status: 400 });
  }

  const apiKey = process.env.GOAPI_KEY || process.env.INVEZGO_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API Key GoAPI/Invezgo belum diatur di Environment Variables' }, { status: 500 });
  }

  try {
    // Memanggil API GoAPI historical untuk 30 hari terakhir agar bisa hitung MA20
    const url = `https://api.goapi.id/v1/stock/idx/${ticker}/historical?api_key=${apiKey}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Kode saham tidak valid atau data tidak tersedia di bursa' }, { status: 404 });
    }

    const json = await res.json();
    const dataList = json.data?.results || json.data || json.results;

    if (!dataList || !Array.isArray(dataList) || dataList.length === 0) {
      return NextResponse.json({ error: 'Data emiten tidak ditemukan di sistem API API' }, { status: 404 });
    }

    // Pastikan urutan tanggal terbaru di indeks 0
    let sortedData = [...dataList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const latest = sortedData[0];
    
    // Hitung MA20 Volume dari maksimal 20 hari terakhir
    const last20 = sortedData.slice(0, 20);
    const sumVolume = last20.reduce((acc, curr) => acc + Number(curr.volume || curr.vol || 0), 0);
    const ma20Volume = last20.length > 0 ? Math.round(sumVolume / last20.length) : 0;

    return NextResponse.json({
      open: latest.open,
      high: latest.high,
      low: latest.low,
      close: latest.close,
      volume: latest.volume || latest.vol,
      ma20Volume: ma20Volume
    });
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Server gagal terhubung ke penyedia data bursa' }, { status: 500 });
  }
}

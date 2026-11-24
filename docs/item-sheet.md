# Item sheet (starting values, tune in Stage 2)
Wt1 and Wt2: 1 hand. Wt3: both hands. Base 2.6 tiles/s x hands in use (none 1, one 0.86, two 0.72); weight adds no slowdown of its own; stairs and ladder x0.7; never below x0.5. Grab 0.25/0.4/0.65s by weight. Carry s = 10 tile crossing at that speed (data.js TUNE is the source). Nilai is game score, invented.
Sources: Ready2go Beg kit (sgm.org.my Emergency-Kit_bm.pdf), DOSM beg bencana (dosm.gov.my downloads-log?id=544). Game flavor items are not from official lists.
Source check, 2026-11-16:
- DOSM file (a newspaper column hosted there): lists wisel, lampu suluh, ubat-ubatan, radio berkuasa bateri, pakaian dan peralatan mandi, air minuman bersih, makanan dalam tin, wang tunai, bateri tambahan, dokumen penting. All 10 kit items match. "Selimut" is not in it.
- Ready2go file: the sgm.org.my link returns 404. UNVERIFIED, so every "Ready2go" and "both" below rests on the DOSM file alone.
- Result card tip ("Kalau diarah pindah, terus pindah. Jangan tunggu air naik.") paraphrases the same DOSM file: "Akur kepada arahan pihak berkuasa jika diminta berpindah dan tinggalkan kediaman secepat mungkin". A waterproof-container line could not be sourced and is not used.
- Alert words: the official flood portal legend ("Petunjuk Aras Air") shows exactly Normal, Waspada, Amaran, Bahaya. "bersedia berpindah" for Amaran is backed only by a news report describing the portal, not by a page fetched from it.

| Item (BM) | Source | Wt | Nilai | Carry s |
|---|---|---|---|---|
| Dokumen Penting | Ready2go, DOSM | 1 | 10 | 4.5 |
| Ubat-ubatan | Ready2go, DOSM | 1 | 7 | 4.5 |
| Wang Tunai | both | 1 | 6 | 4.5 |
| Lampu Suluh | both | 1 | 3 | 4.5 |
| Radio Bateri | DOSM | 1 | 3 | 4.5 |
| Bateri Tambahan | DOSM | 1 | 3 | 4.5 |
| Wisel | DOSM | 1 | 1 | 4.5 |
| Air Minuman Bersih | DOSM | 2 | 5 | 4.5 |
| Makanan Tin | DOSM | 2 | 4 | 4.5 |
| Pakaian & Selimut | both | 2 | 4 | 4.5 |
| Kucing (Comot) | flavor, runs off | 1 | 9 | 4.5 |
| Peti Sejuk | flavor, decoy | 3 | 2 | 5.3 |
| TV | flavor, decoy | 3 | 2 | 5.3 |

Spawn 9 to 10 per run. Rooms flood: Serambi, Dapur, Ruang Tamu, Bilik. 2 storey house, roof deck (Para) on top. Run ends by boat from the roof (see design.md Water logic). Levels: Normal 0-10s, Waspada 10-30, Amaran 30-55, Bahaya 55-70, then roof and boat wait.

function hexBytes(source) {
  return Uint8Array.from(
    source.trim().split(/\s+/u),
    (value) => Number.parseInt(value, 16),
  );
}

export const ANNEX_F_INTERMEDIATE = Object.freeze([
  Object.freeze({
    example: 2,
    version: 10,
    errorCorrectionLevel: 2,
    mask: 2,
    informationBitLength: 262,
    informationBits: [
      "00010001 11101101 11001000 11000101 01000000 00001111 11110100",
      "10001010 00101100 11000011 01001110 00111101 00001001 00100101",
      "10011010 01111010 00101001 10101011 11101010 00111110 01000110",
      "01001100 01111110 01110011 11101000 01101100 11000111 11100111",
      "00111110 00110011 00101001 11101000 111111",
    ].join(" ").replaceAll(" ", ""),
    informationCodewords: hexBytes(`
      11 ed c8 c5 40 0f f4 8a 2c c3 4e 3d 09 25 9a 7a 29 ab ea 3e
      46 4c 7e 73 e8 6c c7 e7 3e 33 29 e8 fc 00 00 00 00 00 00 00
      00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
      00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
      00 00 00
    `),
    finalCodewords: hexBytes(`
      11 ed c8 c5 40 0f f4 8a 2c c3 4e 3d 09 25 9a 7a 29 ab ea 3e
      46 4c 7e 73 e8 6c c7 08 57 0c e0 7a a5 dd a2 99 cf a4 82 ad
      11 b0 84 74 5d 9a 99 0b cd 49 77
      e7 3e 33 29 e8 fc 00 00 00 00 00 00 00 00 00 00 00 00 00 00
      00 00 00 00 00 00 00 a2 a7 68 8a 5f e6 aa 11 a6 69 4a cf cf
      20 5d 00 1b 79 a1 fe b7 94 03 9b
      00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
      00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
      00 00 00 00 00 00 00 00 00 00 00 00 00
    `),
    placedCodewords: hexBytes(`
      11 25 c7 ad 3e 00 a2 20 00 00 00 00 ed 9a 08 11 33 00 a7 5d
      00 00 00 00 c8 7a 57 b0 29 00 68 00 00 00 00 00 c5 29 0c 84
      e8 00 8a 1b 00 00 00 00 40 ab e0 74 fc 00 5f 79 00 00 00 00
      0f ea 7a 5d 00 00 e6 a1 00 00 00 00 f4 3e a5 9a 00 00 aa fe
      00 00 00 00 8a 46 dd 99 00 00 11 b7 00 00 00 00 2c 4c a2 0b
      00 00 a6 94 00 00 00 00 c3 7e 99 cd 00 00 69 03 00 00 00 00
      4e 73 cf 49 00 00 4a 9b 00 00 00 00 3d e8 a4 77 00 00 cf 00
      00 00 00 00 09 6c 82 e7 00 00 cf 00 00 00 00
    `),
    functionCodewords: Uint8Array.of(0x1, 0xE, 0xA, 0x6, 0x7, 0xA, 0xE),
  }),
  Object.freeze({
    example: 3,
    version: 17,
    errorCorrectionLevel: 1,
    mask: 2,
    informationBitLength: 1560,
    publishedExcessPaddingCodewords: 42,
    informationCodewords: hexBytes(`
      27 38 c3 0a 35 f9 cf 99 92 f9 26 a3 e7 3e 76 c9 ae a3 7f 9c
      fa 9c b5 f9 cf 86 f9 cf 93 e3 1a 3e 73 e0 80 04 5f 9c f8 10
      fe b3 e0 00 fa df 82 00 11 7f 47 a1 ff f2 1b f4 d5 9f ff 21
      bf 49 04 c9 4f ff 20 01 fd 87 85 7f ff 20 00 fd 0b 1f ff c9
      95 bf 6a 1f 6a b6 82 99 1a 87 36 70 6c a0 d9 d1 b3 ff ff e5
      f5 bf 04 00 22 fe e0 5c 01 21 bf 70 38 c8 90 df b8 1c 8e 48
      10 ff 70 36 cc b8 1c 38 5c 10 30 2e 07 0a 97 03 22 0b 81 60
      f9 c0 e5 82 e0 7d ad 70 3c e8 17 d5 7c 10 00 8b fa 3d 0f ff
      90 df a6 ac ff f9 0d fa 1e 85 c1 da 57 ff 90 21 fd 67 c0 01
      fa 0f ce 4f 1e c6 a3 b8 f4 12 7f f9 7d 6f e0 00 00 00 00 00
      00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
      00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
      00 00 00 00 00 00 00 00 00 00 00
    `),
    finalCodewords: hexBytes(`
      27 38 c3 0a 35 f9 cf 99 92 f9 26 a3 e7 3e 76 c9 ae a3 7f 9c
      fa 9c b5 f9 cf 86 f9 cf 93 e3 1a 3e 73 e0 80 04 5f 9c f8 10
      fe b3 e0 00 fa df 82 00 11 7f 47 a1 ff f2 1b f4 d5 9f ff 21
      bf 49 04 c9 4f ff 20 01 fd 87 0e 05 48 1c f0 5c dc e0 68 ed
      bf 45 73 5f dc 8a f2 76 28 cf 11 94 ab 85 e8 de 93 29 96 29
      85 7f ff 20 00 fd 0b 1f ff c9 95 bf 6a 1f 6a b6 82 99 1a 87
      36 70 6c a0 d9 d1 b3 ff ff e5 f5 bf 04 00 22 fe e0 5c 01 21
      bf 70 38 c8 90 df b8 1c 8e 48 10 ff 70 36 cc b8 1c 38 5c 10
      30 2e 07 0a 97 03 22 0b 81 60 a9 b6 77 ab 56 cc 27 9d bd 8c
      c6 9f aa 8d 9a d4 2d f0 0d 7a 81 a6 21 aa 42 a5 54 4f 6d d9
      f9 c0 e5 82 e0 7d ad 70 3c e8 17 d5 7c 10 00 8b fa 3d 0f ff
      90 df a6 ac ff f9 0d fa 1e 85 c1 da 57 ff 90 21 fd 67 c0 01
      fa 0f ce 4f 1e c6 a3 b8 f4 12 7f f9 7d 6f e0 00 00 00 00 00
      00 00 00 00 00 00 00 00 00 0b 7e f1 33 0d 51 ea 93 54 bd
      62 b3 68 17 58 c0 e0 e1 a9 03 c1 0a c8 72 d2 68 c1 14 9e 43
    `),
    placedCodewords: hexBytes(`
      27 3e f9 10 ff ff 68 94 00 99 f5 c8 1c 60 aa a5 3c df 90 b8
      00 0d e1 38 76 cf fe f2 20 ed ab fd 1a bf 90 38 a9 8d 54 e8
      a6 21 f4 00 51 a9 c3 c9 93 b3 1b 01 bf 85 0b 87 04 df 5c b6
      9a 4f 17 ac fd 12 00 ea 03 0a ae e3 e0 f4 fd 45 e8 1f 36 00
      b8 10 77 d4 6d d5 ff 67 7f 00 93 c1 35 a3 1a 00 d5 87 73 de
      ff 70 22 1c 30 ab 2d d9 7c f9 c0 f9 00 54 0a f9 7f 3e fa 9f
      0e 5f 93 c9 6c fe 8e 2e 56 f0 f9 10 0d 01 7d 00 bd c8 cf 9c
      73 df ff 05 dc 29 95 a0 e0 48 07 cc 0d c0 00 fa fa 6f 00 62
      72 99 fa e0 82 21 48 8a 96 bf d9 5c 10 0a 27 7a e5 8b 1e 0f
      e0 00 b3 d2 92 9c 80 00 bf 1c f2 29 6a d1 01 ff 97 9d 81 82
      fa 85 ce 00 00 68 68 f9 b5 04 11 49 f0 76 85 1f b3 21 70 03
      bd a6 e0 3d c1 4f 00 0b 17 c1 26 f9 5f 7f 04 5c 28 7f 6a ff
      bf 36 22 8c 21 7d 0f da 1e 00 7e 58 14 a3 cf 9c 47 c9 dc cf
      ff b6 ff 70 cc 0b c6 aa ad ff 57 c6 00 f1 c0 9e e7 86 f8 a1
      4f e0 11 20 82 e5 38 b8 81 9f 42 70 90 ff a3 00 33 e0 43
    `),
    functionCodewords: Uint8Array.of(0x2, 0x5, 0x6, 0x6, 0x0, 0xB, 0xC),
  }),
]);

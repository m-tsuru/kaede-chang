#!/bin/bash

TARGET_EXTENSION="png"

# 指定された拡張子のファイルに対してループ処理
for INPUT_FILE in *.${TARGET_EXTENSION}; do
  # ファイルが存在しない場合のglobのエラーを防ぐ
  [ -e "$INPUT_FILE" ] || continue

  echo "Processing: ${INPUT_FILE}"

  # ファイル名と拡張子を取得
  FILENAME=$(basename -- "$INPUT_FILE")
  EXTENSION="${FILENAME##*.}"
  BASENAME="${FILENAME%.*}"

  # 0, 90, 180, 270度の角度でループ処理
  for angle in 0 90 180 270; do
    OUTPUT_FILE="${BASENAME}_${angle}.${EXTENSION}"
    echo "${angle} => ${OUTPUT_FILE} "
    convert "${INPUT_FILE}" -rotate "${angle}" -trim "${OUTPUT_FILE}"
  done
done

echo "全ての処理が完了しました。"

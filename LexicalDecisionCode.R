library(dplyr)
library(tidyr)
library(purrr)

process_log_file <- function(file_path) {
  # ファイル名から参加者情報を抽出
  file_name <- basename(file_path)
  participant_id <- sub(".*_([0-9]+)_.*", "\\1", file_name)
  
  # データ読み込み
  data <- read.table(file_path, 
                     header = TRUE, 
                     sep = "\t", 
                     stringsAsFactors = FALSE) %>%
    as_tibble()
  
  # 刺激タイプの定義
  stim_types <- c("Nonword", "RealWord", "Filler")
  
  # 刺激の開始と終了を抽出
  stim_data <- data %>%
    filter(Stimuli %in% stim_types) %>%
    group_by(Target_Word, Stimuli) %>%
    summarize(
      Stimuli_Start = Response_Time[Response == "None"],
      Final_Time = Response_Time[Response != "None"],
      Final_Response = Response[Response != "None"],
      .groups = "drop"
    )
  
  # キー押しデータを抽出して結合
  key_data <- data %>%
    filter(Stimuli == "KeyPress") %>%
    select(Response_Time, Response) %>%
    rename(KeyPress_Time = Response_Time,
           KeyPress_Response = Response)
  
  # 各刺激に対応するキー押しを特定
  result <- stim_data %>%
    rowwise() %>%
    mutate(
      KeyPress_Time = key_data$KeyPress_Time[
        which(key_data$KeyPress_Time > Stimuli_Start & 
                key_data$KeyPress_Time < Final_Time)[1]
      ],
      KeyPress_Response = key_data$KeyPress_Response[
        which(key_data$KeyPress_Time > Stimuli_Start & 
                key_data$KeyPress_Time < Final_Time)[1]
      ],
      RT = KeyPress_Time - Stimuli_Start,
      Signal_Detection = case_when(
        Stimuli == "Nonword" & KeyPress_Response == "1" ~ "False_Alarm",
        Stimuli == "RealWord" & KeyPress_Response == "1" ~ "Hit",
        Stimuli == "Nonword" & KeyPress_Response == "2" ~ "Correct_Rejection",
        Stimuli == "RealWord" & KeyPress_Response == "2" ~ "Miss",
        Stimuli == "Filler" ~ "Filler",
        TRUE ~ NA_character_
      ),
      Participant = participant_id,
      File_Name = file_name
    ) %>%
    ungroup()
  
  return(result)
}

# ディレクトリ内の全ログファイルを処理
process_directory <- function(directory_path) {
  log_files <- list.files(directory_path, 
                          pattern = "\\.log$", 
                          full.names = TRUE)
  
  all_results <- map_df(log_files, safely(process_log_file)) %>%
    filter(!is.null(result)) %>%
    select(-error) %>%
    unnest(cols = c(result))
  
  return(all_results)
}

# 使用例
results <- process_directory("path/to/log/directory")
write.csv(results, "all_participants_results.csv", row.names = FALSE)
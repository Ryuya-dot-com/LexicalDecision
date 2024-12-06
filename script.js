// script.js

// 以下は刺激の一覧です。Nonword・RealWord・Filterの3つの数および単語を修正することができます。
const main_stimuli = [
    ["piewed","piewed_Nonword"],
    ["spicel","spicel_Nonword"],
    ["banden","banden_Nonword"],
    ["shinge","shinge_Nonword"],
    ["burker","burker_Nonword"],
    ["borres","borres_Nonword"],
    ["fithes","fithes_Nonword"],
    ["nodics","nodics_Nonword"],
    ["givict","givict_Nonword"],
    ["briate","briate_Nonword"],
    ["head","head_RealWord"],
    ["bowl","bowl_RealWord"],
    ["shell","shell_RealWord"],
    ["cow","cow_RealWord"],
    ["trip","trip_RealWord"],
    ["coast","coast_RealWord"],
    ["floor","floor_RealWord"],
    ["dog","dog_RealWord"],
    ["prepare","prepare_Filler"],
    ["guess","guess_Filler"],
    ["choose","choose_Filler"],
    ["hit","hit_Filler"],
    ["wear","wear_Filler"],
    ["grow","grow_Filler"]
];

let participantId = "";
let results = [];
let currentIndex = 0;
let trialRunning = false;
let stimuli = [];
let experimentStartTime = null; // 最初の'5'トリガー時刻
let trialStartTime = 0; 
let stimulusTimeout = null; 
let currentResponse = null; // 刺激中に得られた応答（'1','2'）
const displayArea = document.getElementById("display-area");

function getCondition(wordType) {
    if (wordType.endsWith("_Nonword")) return "Nonword";
    if (wordType.endsWith("_RealWord")) return "RealWord";
    if (wordType.endsWith("_Filler")) return "Filler";
    return "Unknown";
}

function shuffleAndAvoidTripleCondition(arr) {
    let arrCopy = arr.slice();
    for (let i = arrCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arrCopy[i], arrCopy[j]] = [arrCopy[j], arrCopy[i]];
    }
    for (let i = 0; i < arrCopy.length - 2; i++) {
        let c1 = getCondition(arrCopy[i][1]);
        let c2 = getCondition(arrCopy[i+1][1]);
        let c3 = getCondition(arrCopy[i+2][1]);
        if (c1 === c2 && c2 === c3) {
            for (let j = i+3; j < arrCopy.length; j++) {
                let cj = getCondition(arrCopy[j][1]);
                if (cj !== c3) {
                    [arrCopy[i+2], arrCopy[j]] = [arrCopy[j], arrCopy[i+2]];
                    break;
                }
            }
        }
    }
    return arrCopy;
}

// フォントサイズを変更する場合は以下を修正します
function showText(text) {
    displayArea.style.fontSize = "28pt";
    displayArea.textContent = text;
}

function showFixation() {
    displayArea.style.fontSize = "28pt";
    displayArea.textContent = "++++";
    logEvent("++++", "Fixation", "None");
}

function logEvent(target_word, stimuli_type, response) {
    if (experimentStartTime === null) {
        // まだ最初の'5'が押されていない場合は記録しません
        return;
    }
    let t = performance.now() - experimentStartTime;
    results.push({
        "Participant": participantId,
        "Target_Word": target_word,
        "Stimuli": stimuli_type,
        "Response": response,
        "Response_Time": t.toFixed(3)
    });
}

function startExperiment() {
    stimuli = shuffleAndAvoidTripleCondition(main_stimuli);
    currentIndex = 0;
    trialRunning = false;
    // 開始前に10秒固定注視を追加します
    showFixation();
    setTimeout(() => {
        nextTrial();
    }, 10000);
}

function nextTrial() {
    if (currentIndex >= stimuli.length) {
        // 最終刺激後10秒注視を追加します
        showFixation();
        setTimeout(() => {
            endExperiment();
        }, 10000);
        return;
    }

    trialRunning = false;
    showFixation();

    let fixationDuration = Math.random() * (6 - 2) + 2;
    setTimeout(() => {
        showWord(stimuli[currentIndex][0], stimuli[currentIndex][1]);
    }, fixationDuration * 1000);
}

function showWord(word, wordType) {
    trialRunning = true;
    currentResponse = null;
    displayArea.style.fontSize = "64pt";
    displayArea.textContent = word;

    // 刺激の提示を記録
    let cond = getCondition(wordType);
    logEvent(word, cond, "None");

    trialStartTime = performance.now();

    stimulusTimeout = setTimeout(() => {
        finishTrial(word, cond);
    }, 3000);
}

function finishTrial(word, cond) {
    clearTimeout(stimulusTimeout);
    stimulusTimeout = null;

    // 3秒経過後、最後の応答を記録します
    let finalResponse = currentResponse ? currentResponse : "noresponse";
    logEvent(word, cond, finalResponse);

    trialRunning = false;
    currentIndex++;
    nextTrial();
}

function recordKeyPress(key) {
    // 全てのキー押下を記録（ただしexperimentStartTime後）
    // 5はMRIトリガーとして記録し、1,2はKeyPressで記録
    if (key === "5") {
        logEvent("5", "Trigger", "5");
    } else if (key === "1" || key === "2") {
        logEvent("KeyPress", "KeyPress", key);
    }
}

// MRIトリガー'5'を初回受けた時にexperimentStartTimeをセット
function handleTrigger() {
    if (experimentStartTime === null) {
        experimentStartTime = performance.now();
        // 最初のトリガー記録
        logEvent("5", "Trigger", "5");
        startExperiment();
    } else {
        // 2回目以降の'5'キーもイベントとして記録
        recordKeyPress("5");
    }
}

function endExperiment() {
    // 結果ファイル自動ダウンロード
    showText("実験が終了しました。結果をダウンロードしています...");

    // CSVファイル
    const header = ["Participant","Target_Word","Stimuli","Response","Response_Time"];
    const csvLines = [header.join(",")];
    for (const r of results) {
        csvLines.push([r["Participant"], r["Target_Word"], r["Stimuli"], r["Response"], r["Response_Time"]].join(","));
    }
    const csvContent = "\uFEFF" + csvLines.join("\n");
    const csvBlob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement("a");
    csvLink.href = csvUrl;
    csvLink.download = "lexical_decision_results_" + participantId + "_" + new Date().toISOString().replace(/[-:T]/g,"").split(".")[0] + ".csv";
    document.body.appendChild(csvLink);
    csvLink.click();
    document.body.removeChild(csvLink);
    URL.revokeObjectURL(csvUrl);

    // LOGファイル（タブ区切り）
    const logLines = [header.join("\t")];
    for (const r of results) {
        logLines.push([r["Participant"], r["Target_Word"], r["Stimuli"], r["Response"], r["Response_Time"]].join("\t"));
    }
    const logContent = logLines.join("\n");
    const logBlob = new Blob([logContent], {type: "text/plain;charset=utf-8;"});
    const logUrl = URL.createObjectURL(logBlob);
    const logLink = document.createElement("a");
    logLink.href = logUrl;
    logLink.download = "lexical_decision_results_" + participantId + "_" + new Date().toISOString().replace(/[-:T]/g,"").split(".")[0] + ".log";
    document.body.appendChild(logLink);
    logLink.click();
    document.body.removeChild(logLink);
    URL.revokeObjectURL(logUrl);

    showText("結果ファイルのダウンロードが完了しました。実験終了です。");
}

document.addEventListener('keydown', (e) => {
    if (e.key === "5") {
        handleTrigger();
    } else if (e.key === "1" || e.key === "2") {
        if (experimentStartTime !== null) {
            recordKeyPress(e.key);
        }
        // 刺激提示中に'1','2'が押された場合、currentResponseに記録（最終応答用）
        if (trialRunning && (e.key === "1" || e.key === "2")) {
            if (currentResponse === null) {
                currentResponse = e.key;
            }
        }
    }
    // 他のキーは特に記録しない
});

window.onload = () => {
    participantId = prompt("参加者IDを入力してください","");
    if (!participantId) {
        participantId = "unknown";
    }
    const instructionText = `
これからXX語の英単語が提示されます。

知っている単語であればYes(人差し指)、
知らない単語であればNo(中指)を押してください。

単語は3秒間提示されます。
できる限り早く正確に答えてください。
ボタンを押しても次の単語にはすぐには進みません。

単語の間には++++が表示されます。
`;
    showText(instructionText);
};

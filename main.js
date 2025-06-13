// main.js
console.log("main.js実行開始"); // 動作確認のためログに出力する。
// ソースコード始め

// ユーザインタフェースをidで探し、変数に代入する。
input1=document.getElementById("input1");
button1=document.getElementById("button1");
output1=document.getElementById("output1");

alert("OKをクリックしてください。"); // 動作確認用

button1.addEventListener("click", ()=>{
    // ボタンをクリックしたときに行う処理を以下に記述する。
    alert("input1.value="+input1.value); // 動作確認用
    output1.innerHTML=input1.value.length; // 例：文字列の長さを表示する。
});

// ソースコード終り
console.log("main.js実行終了"); // 動作確認のためログに出力する。

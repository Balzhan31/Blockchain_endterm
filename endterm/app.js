// -------------------- Local Game Score --------------------
let userScore = 0;
let computerScore = 0;

const userScore_span = document.getElementById('user-score');
const computerScore_span = document.getElementById('computer-score');
const result_p = document.querySelector('.result > p');
const rock_div = document.getElementById('r');
const paper_div = document.getElementById('p');
const scissors_div = document.getElementById('s');

// -------------------- Blockchain Setup --------------------
const contractAddress = "0x3bB62448BBE43152845161F68B82Cd7956544774"; 
const contractABI = [
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "enum RPS.Move",
				"name": "playerMove",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "enum RPS.Move",
				"name": "computerMove",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "result",
				"type": "string"
			}
		],
		"name": "GamePlayed",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "enum RPS.Move",
				"name": "_playerMove",
				"type": "uint8"
			}
		],
		"name": "play",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "withdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "betAmount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

let provider;
let signer;
let contract;

const connectBtn = document.getElementById("connectBtn");

// -------------------- Connect Wallet --------------------
connectBtn.addEventListener("click", async () => {
    if (!window.ethereum) {
        alert("Install MetaMask!");
        return;
    }

    try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        contract = new ethers.Contract(contractAddress, contractABI, signer);

        connectBtn.innerText = "Wallet Connected";

        contract.removeAllListeners("GamePlayed");
        setupEventListener();

    } catch (error) {
        console.error("Connection error:", error);
    }
});

// -------------------- Utility Functions --------------------

function convertToWord(move) {
    if (move === 'r' || move === 0) return "Rock";
    if (move === 'p' || move === 1) return "Paper";
    if (move === 's' || move === 2) return "Scissors";
    return "Unknown";
}

function getLocalComputerChoice() {
    const choices = ['r', 'p', 's'];
    return choices[Math.floor(Math.random() * 3)];
}

// -------------------- GAME HISTORY --------------------
const historyDiv = document.getElementById("history");

function addToHistory(playerMove, computerMove, resultText) {
    const entry = document.createElement("div");
    entry.className = "history-entry";

    entry.innerHTML = `
        <p><b>You:</b> ${convertToWord(playerMove)}  
        &nbsp; | &nbsp; 
        <b>Computer:</b> ${convertToWord(computerMove)}</p>
        <p><b>Result:</b> ${resultText}</p>
        <hr>
    `;

    historyDiv.prepend(entry);
}

// -------------------- UI Update --------------------
function updateUI(playerMove, computerMove, resultText) {
    result_p.innerHTML = `${convertToWord(playerMove)} (you) vs ${convertToWord(computerMove)} (computer). ${resultText}`;

    const resLower = resultText.toLowerCase();
    let elementId;

    if (playerMove === 0 || playerMove === 'r') elementId = 'r';
    if (playerMove === 1 || playerMove === 'p') elementId = 'p';
    if (playerMove === 2 || playerMove === 's') elementId = 's';

    if (resLower.includes("player wins") || resLower.includes("you win")) {
        userScore++;
        userScore_span.innerHTML = userScore;
        document.getElementById(elementId).classList.add('green-glow');
        setTimeout(() => document.getElementById(elementId).classList.remove('green-glow'), 500);
    } 
    else if (resLower.includes("computer wins") || resLower.includes("lose")) {
        computerScore++;
        computerScore_span.innerHTML = computerScore;
        document.getElementById(elementId).classList.add('red-glow');
        setTimeout(() => document.getElementById(elementId).classList.remove('red-glow'), 500);
    }

    // Add history entry
    addToHistory(playerMove, computerMove, resultText);
}

// -------------------- Main Game Logic --------------------
async function game(userChoice) {
    if (contract) {
        result_p.innerHTML = "Confirm transaction in MetaMask...";

        const choiceNum = (userChoice === 'r') ? 0 : (userChoice === 'p') ? 1 : 2;

        try {
            const tx = await contract.play(choiceNum, {
                value: ethers.utils.parseEther("0.0001")
            });

            result_p.innerHTML = "Transaction sent! Mining...";

            const receipt = await tx.wait();

            const event = receipt.events.find(e => e.event === "GamePlayed");

            if (event) {
                updateUI(event.args.playerMove, event.args.computerMove, event.args.result);
            } else {
                result_p.innerHTML = "Game finished, but no event was found.";
            }

        } catch (error) {
            console.error(error);
            result_p.innerHTML = "Transaction failed or rejected.";
        }

        return;
    }

    // Local game fallback
    const computerChoice = getLocalComputerChoice();
    let resultMessage = "";

    if (userChoice + computerChoice === "rs" || userChoice + computerChoice === "pr" || userChoice + computerChoice === "sp") {
        resultMessage = "You win!";
    } 
    else if (userChoice + computerChoice === "rp" || userChoice + computerChoice === "ps" || userChoice + computerChoice === "sr") {
        resultMessage = "You lose.";
    } 
    else {
        resultMessage = "It's a draw.";
    }

    updateUI(userChoice, computerChoice, resultMessage);
}

// -------------------- Event Listener For Contract --------------------
function setupEventListener() {
    contract.on("GamePlayed", async (player, playerMove, computerMove, result) => {
        const userAddr = await signer.getAddress();
        if (player.toLowerCase() === userAddr.toLowerCase()) return; // avoid duplicate handling

        console.log("Another user played:", result);
    });
}

if (window.ethereum) {
    window.ethereum.on("chainChanged", () => window.location.reload());
}

// -------------------- Button Handlers --------------------
function main() {
    rock_div.addEventListener("click", () => game('r'));
    paper_div.addEventListener("click", () => game('p'));
    scissors_div.addEventListener("click", () => game('s'));
}

main();
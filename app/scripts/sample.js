const { provider } = require("./provider");
const settings = require("../settings");

const doSomething = async () => {
  let p = await provider();
  let accounts = await p.eth.getAccounts();
  // console.log("Accounts:", accounts);

  // Load a contract
  // const myContract = new p.eth.Contract(myContractABI, myContractAddress);
  // console.log(`Loaded My Contract @ ${myContract._address}`);
  // const valueFromContract = await myContract.methods.myMethod().call();
  // let tx = await myContract.method.myPayableMethod().send({from: accounts[0], gasLimit: "1000000", value: p.eth.toWei("0.1", "ether")});
  // console.log("Gas used:", tx.gasUsed);
};

doSomething()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

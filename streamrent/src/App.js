import React, { Component } from "react";
import Web3 from "web3";
import Portis from "@portis/web3";
import { Biconomy } from "@biconomy/mexa";
import { AssetAddress, AssetABI, DAIxAddress } from "./config.js";
import { Container, Row, Col, Form, Button } from "react-bootstrap";

import "./App.css";

const SuperfluidSDK = require("@superfluid-finance/js-sdk");
const { web3tx, toWad, toBN } = require("@decentral.ee/web3-helpers");

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      account: "",
      network: "",
      balance: "",
      available: [],
      rented: [],
      loading: true,
      newURI: "",
    };

    this.mintAsset = this.mintAsset.bind(this);
    this.rentAsset = this.rentAsset.bind(this);
    this.returnAsset = this.returnAsset.bind(this);
  }

  componentDidMount() {
    this.loadData();
  }

  async mintAsset(e) {
    this.setState({
      loading: true,
    });

    let tokenURI = this.state.newURI;
    this.setState({ loading: true });

    const result = await this.state.NFT.methods
      .createAsset(tokenURI)
      .send({ from: this.state.account });
    console.log(result);
    const available = await this.state.NFT.methods.getAvailableTokens().call();
    console.log(available);

    this.setState({
      available: available,
      loading: false,
    });
  }

  async rentAsset(e) {
    this.setState({
      loading: true,
    });

    let tokenURI = e.target.getAttribute("data-token");
    let contract = this.state.NFT._address;
    let sf = this.state.sf;
    console.log(contract);

    let flowRate = toWad("1").div(toBN(3600));

    await sf.cfa.createFlow({
      flowRate: flowRate.toString(),
      receiver: contract,
      sender: this.state.user.address,
      superToken: DAIxAddress,
      userData: this.state.web3.eth.abi.encodeParameter("uint256", tokenURI),
    });

    const available = await this.state.NFT.methods.getAvailableTokens().call();
    const rented = await this.state.NFT.methods.getRentedTokens().call();

    this.setState({
      available: available,
      rented: rented,
      loading: false,
    });
  }

  async returnAsset(e) {
    this.setState({
      loading: true,
    });

    let tokenURI = e.target.getAttribute("data-token");
    let contract = this.state.NFT._address;
    let sf = this.state.sf;
    console.log(contract);

    await sf.cfa.deleteFlow({
      by: this.state.user.address,
      receiver: contract,
      sender: this.state.user.address,
      superToken: DAIxAddress,
      userData: this.state.web3.eth.abi.encodeParameter("uint256", tokenURI),
    });

    const available = await this.state.NFT.methods.getAvailableTokens().call();
    const rented = await this.state.NFT.methods.getRentedTokens().call();

    this.setState({
      available: available,
      rented: rented,
      loading: false,
    });
  }

  async loadData() {
    const portis = new Portis(
      "905009b8-cdbf-4ee2-b407-6e21fb084540",
      "maticMumbai"
    );
    const biconomy = new Biconomy(portis.provider, {
      apiKey: "6nzy1LAUf.eee5bb89-9c8e-43f2-9bb5-81fd77ab2b17",
      debug: true,
    });
    const web3 = new Web3(biconomy);

    biconomy
      .onEvent(biconomy.READY, async () => {
        this.setState({
          web3: web3,
        });
        
        web3.eth.getAccounts((error, accounts) => {
          console.log(accounts);
        });

        const network = await web3.eth.net.getNetworkType();
        const sf = new SuperfluidSDK.Framework({
          web3,
          tokens: ["fDAI"],
        });
        await sf.initialize();

        const account = (await web3.eth.getAccounts())[0];
        const balance = await web3.eth.getBalance(account);

        const user = sf.user({
          address: account,
          token: DAIxAddress,
        });

        this.setState({
          balance: web3.utils.fromWei(balance, "ether"),
          account: account,
          user: user,
          network: network,
          sf: sf,
        });

        const NFT = await new web3.eth.Contract(AssetABI, AssetAddress);
        console.log(NFT);
        this.setState({ NFT });

        const available = await NFT.methods.getAvailableTokens().call();
        const rented = await NFT.methods
          .getRentedTokens()
          .call({ from: this.state.account });
        console.log(available);
        console.log(rented);
        this.setState({
          available: available,
          rented: rented,
        });

        this.setState({
          loading: false,
        });
      })
      .onEvent(biconomy.ERROR, (error, message) => {
        console.error(error, message);
      });
  }

  render() {
    return (
      <Container>
        {this.state.loading ? (
          <div></div>
        ) : (
          <Container>
            <Row>
              <h1>Stream Rent</h1>
            </Row>
            <Row>
              <p> Account address : {this.state.account} </p>
            </Row>
            <Row>
              <p> Account Balance : {this.state.balance} </p>
            </Row>
            <Row>
              <Form onSubmit={this.mintAsset}>
                <Form.Group>
                  <Form.Control
                    type="text"
                    placeholder="Asset URI"
                    value={this.state.newURI}
                    onChange={(e) => this.setState({ newURI: e.target.value })}
                  />
                </Form.Group>
                <Button type="submit">Create Asset</Button>
              </Form>
            </Row>
            <br></br>
            <Row>
              <Col>
                <h3>Available Tokens</h3>
                {this.state.available.map((item, index) => (
                  <div>
                    <li>{item}</li>
                    <Button data-token={item} onClick={this.rentAsset}>
                      Rent
                    </Button>
                  </div>
                ))}
              </Col>
              <Col>
                <h3>Rented Tokens</h3>

                {this.state.rented.map((item, index) => (
                  <div>
                    <li>{item}</li>
                    <Button data-token={item} onClick={this.returnAsset}>
                      Return
                    </Button>
                  </div>
                ))}
              </Col>
            </Row>
          </Container>
        )}
      </Container>
    );
  }
}

export default App;

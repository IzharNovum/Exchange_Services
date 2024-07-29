import express from "express";
import OkexService from "../Exchange/OkexExchangeService.js";

const router1 = express.Router();
const router2 = express.Router();
const router3 = express.Router();
const router4 = express.Router();
const router5 = express.Router();
const router6 = express.Router();
const router7 = express.Router();


router1.get("/", (req, res) => {
  res.send("Hello from Router 1!");
});

router2.get("/", (req, res) => {
  res.send(OkexService.fetchBalanceFromExchange());
});

router3.get("/", (req, res) => {
  res.send(OkexService.placeOrderOnExchage());
});

router4.get("/", (req, res) => {
  console.log(OkexService.cancelOrderFromExchange());
});
router5.get("/", (req, res) => {
  console.log(OkexService.fetchOrderFromExchange());
});
router6.get("/", (req, res) => {
  console.log(OkexService.loadTradesForClosedOrder());
});
router7.get("/", (req, res) => {
res.send(OkexService.fetchKlines());
});

export { router1, router2, router3, router4, router5, router6, router7 };

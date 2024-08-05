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

router2.get("/", async (req, res) => {
  try {
      const balance = await OkexService.fetchBalanceFromExchange();
      res.json(balance);
  } catch (error) {
      console.error("Error fetching balance:", error.message);
      res.status(500).json({ error: "Failed to fetch balance" });
  }
});

router3.get("/", async (req, res) => {
  try {
      const PlaceOrder = await OkexService.placeOrderOnExchage();
      res.json(PlaceOrder);
  } catch (error) {
      console.error("Error fetching PlaceOrder:", error.message);
      res.status(500).json({ error: "Failed to fetch PlaceOrder" });
  }
});


// router3.get("/", (req, res) => {
//   res.send(OkexService.placeOrderOnExchage());
// });
router4.get("/", async (req, res) => {
  try {
      const CancelOrder = await OkexService.cancelOrderFromExchange();
      res.json(CancelOrder);
  } catch (error) {
      console.error("Error fetching CancelOrder:", error.message);
      res.status(500).json({ error: "Failed to fetch CancelOrder" });
  }
});
// router4.get("/", (req, res) => {
//   console.log(OkexService.cancelOrderFromExchange());
// });
router5.get("/", async (req, res) => {
  try {
      const FetchOrder = await OkexService.fetchOrderFromExchange();
      res.json(FetchOrder);
  } catch (error) {
      console.error("Error fetching FetchOrder:", error.message);
      res.status(500).json({ error: "Failed to fetch FetchOrder" });
  }
});
// router5.get("/", (req, res) => {
//   console.log(OkexService.fetchOrderFromExchange());
// });
router6.get("/", async (req, res) => {
  try {
      const Trades = await OkexService.loadTradesForClosedOrder();
      res.json(Trades);
  } catch (error) {
      console.error("Error fetching Trades:", error.message);
      res.status(500).json({ error: "Failed to fetch Trades" });
  }
});


router7.get("/", async (req, res) => {
  try {
      const Klines = await OkexService.fetchKlines();
      res.json(Klines);
  } catch (error) {
      console.error("Error fetching Klines:", error.message);
      res.status(500).json({ error: "Failed to fetch Klines" });
  }
});


export { router1, router2, router3, router4, router5, router6, router7 };

// import express from "express";
// import OkexService from "../Exchange/OkexExchangeService.js";

// const router1 = express.Router();
// const router2 = express.Router();
// const router3 = express.Router();
// const router4 = express.Router();
// const router5 = express.Router();
// const router6 = express.Router();
// const router7 = express.Router();
// const router8 = express.Router();



// router1.get("/", (req, res) => {
//   res.send("Hello from Router 1!");
// });

// router2.get("/", async (req, res) => {
//   try {
//       const balance = await OkexService.fetchBalanceFromExchange();
//       res.json(balance);
//   } catch (error) {
//       console.error("Error fetching balance:", error.message);
//       res.status(500).json({ error: "Failed to fetch balance" });
//   }
// });

// router3.get("/", async (req, res) => {
//   try {
//       const PlaceOrder = await OkexService.placeOrderOnExchange();
//       res.json(PlaceOrder);
//   } catch (error) {
//       console.error("Error fetching PlaceOrder:", error.message);
//       res.status(500).json({ error: "Failed to fetch PlaceOrder" });
//   }
// });

// router4.get("/", async (req, res) => {
//   try {
//       const CancelOrder = await OkexService.cancelOrderFromExchange();
//       res.json(CancelOrder);
//   } catch (error) {
//       console.error("Error fetching CancelOrder:", error.message);
//       res.status(500).json({ error: "Failed to fetch CancelOrder" });
//   }
// });

// router5.get("/", async (req, res) => {
//   try {
//       const FetchOrder = await OkexService.fetchOrderFromExchange();
//       res.json(FetchOrder);
//   } catch (error) {
//       console.error("Error fetching FetchOrder:", error.message);
//       res.status(500).json({ error: "Failed to fetch FetchOrder" });
//   }
// });

// router6.get("/", async (req, res) => {
//   try {
//       const Trades = await OkexService.loadTradesForClosedOrder();
//       res.json(Trades);
//   } catch (error) {
//       console.error("Error fetching Trades:", error.message);
//       res.status(500).json({ error: "Failed to fetch Trades" });
//   }
// });


// router7.get("/", async (req, res) => {
//   try {
//       const Klines = await OkexService.fetchKlines();
//       res.json(Klines);
//   } catch (error) {
//       console.error("Error fetching Klines:", error.message);
//       res.status(500).json({ error: "Failed to fetch Klines" });
//   }
// });

// router8.get("/", async (req, res) => {
//   try {
//       const order = await OkexService.OrderDetails();
//       res.json(order);
//   } catch (error) {
//       console.error("Error fetching Trades:", error.message);
//       res.status(500).json({ error: "Failed to fetch Trades" });
//   }
// });


// export { router1, router2, router3, router4, router5, router6, router7, router8 };


import express from "express";
import OkexService from "../Services/Okex_Service.js";
import HuobiService from "../Services/Huobi_Service.js"

const router = express.Router();

const routes = [

      //ROUTES FOR OKEX_SERVICE.... 

    { path: "/Okex-Service/trial", handler: (req, res) => res.send("Hello from Router!") },
    { path: "/Okex-Service/balance", handler: async (req, res) => {
        try {
            const balance = await OkexService.fetchBalanceFromExchange();
            res.json(balance);
        } catch (error) {
            console.error("Error fetching balance:", error.message);
            res.status(500).json({ error: "Failed to fetch balance" });
        }
    }},
    { path: "/Okex-Service/place-order", handler: async (req, res) => {
        try {
            const PlaceOrder = await OkexService.placeOrderOnExchange();
            res.json(PlaceOrder);
        } catch (error) {
            console.error("Error placing order:", error.message);
            res.status(500).json({ error: "Failed to place order" });
        }
    }},
    { path: "/Okex-Service/cancel-order", handler: async (req, res) => {
        try {
            const CancelOrder = await OkexService.cancelOrderFromExchange();
            res.json(CancelOrder);
        } catch (error) {
            console.error("Error canceling order:", error.message);
            res.status(500).json({ error: "Failed to cancel order" });
        }
    }},
    { path: "/Okex-Service/fetch-order", handler: async (req, res) => {
        try {
            const FetchOrder = await OkexService.fetchOrderFromExchange();
            res.json(FetchOrder);
        } catch (error) {
            console.error("Error fetching order:", error.message);
            res.status(500).json({ error: "Failed to fetch order" });
        }
    }},
    { path: "/Okex-Service/trades", handler: async (req, res) => {
        try {
            const Trades = await OkexService.loadTradesForClosedOrder();
            res.json(Trades);
        } catch (error) {
            console.error("Error fetching trades:", error.message);
            res.status(500).json({ error: "Failed to fetch trades" });
        }
    }},
    { path: "/Okex-Service/Klines", handler: async (req, res) => {
        try {
            const Klines = await OkexService.fetchKlines();
            res.json(Klines);
        } catch (error) {
            console.error("Error fetching Klines:", error.message);
            res.status(500).json({ error: "Failed to fetch Klines" });
        }
    }},
    { path: "/Okex-Service/order-details", handler: async (req, res) => {
        try {
            const order = await OkexService.OrderDetails();
            res.json(order);
        } catch (error) {
            console.error("Error fetching order details:", error.message);
            res.status(500).json({ error: "Failed to fetch order details" });
        }
    }},


    //ROUTES FOR HUOBI_SERVICES....

    { path: "/Huobi-Service/account", handler: async (req, res) => {
      try {
          const balance = await HuobiService.accountDetails();
          res.json(balance);
      } catch (error) {
          console.error("Error fetching balance:", error.message);
          res.status(500).json({ error: "Failed to fetch balance" });
      }
  }},
  { path: "/Huobi-Service/account-value", handler: async (req, res) => {
      try {
          const PlaceOrder = await HuobiService.accountValue();
          res.json(PlaceOrder);
      } catch (error) {
          console.error("Error placing order:", error.message);
          res.status(500).json({ error: "Failed to place order" });
      }
  }},
  { path: "/Huobi-Service/balance", handler: async (req, res) => {
      try {
          const CancelOrder = await HuobiService.fetchBalanceOnExchange();
          res.json(CancelOrder);
      } catch (error) {
          console.error("Error canceling order:", error.message);
          res.status(500).json({ error: "Failed to cancel order" });
      }
  }},
  { path: "/Huobi-Service/place-order", handler: async (req, res) => {
      try {
          const FetchOrder = await HuobiService.placeOrderOnExchange();
          res.json(FetchOrder);
      } catch (error) {
          console.error("Error fetching order:", error.message);
          res.status(500).json({ error: "Failed to fetch order" });
      }
  }},
  { path: "/Huobi-Service/order-details", handler: async (req, res) => {
      try {
          const Trades = await HuobiService.orderDetails();
          res.json(Trades);
      } catch (error) {
          console.error("Error fetching trades:", error.message);
          res.status(500).json({ error: "Failed to fetch trades" });
      }
  }},
  { path: "/Huobi-Service/cancel-order", handler: async (req, res) => {
      try {
          const Klines = await HuobiService.cancelOrderOnExchange();
          res.json(Klines);
      } catch (error) {
          console.error("Error fetching Klines:", error.message);
          res.status(500).json({ error: "Failed to fetch Klines" });
      }
  }},
  { path: "/Huobi-Service/fetch-order", handler: async (req, res) => {
      try {
          const order = await HuobiService.fetchOrderFromExchange();
          res.json(order);
      } catch (error) {
          console.error("Error fetching order details:", error.message);
          res.status(500).json({ error: "Failed to fetch order details" });
      }
  }},
  { path: "/Huobi-Service/trades", handler: async (req, res) => {
    try {
        const Klines = await HuobiService.loadTradesForClosedOrder();
        res.json(Klines);
    } catch (error) {
        console.error("Error fetching Klines:", error.message);
        res.status(500).json({ error: "Failed to fetch Klines" });
    }
}},
{ path: "/Huobi-Service/klines", handler: async (req, res) => {
    try {
        const order = await HuobiService.fetchKlines();
        res.json(order);
    } catch (error) {
        console.error("Error fetching order details:", error.message);
        res.status(500).json({ error: "Failed to fetch order details" });
    }
}},
];




routes.forEach(route => router.get(route.path, route.handler));

export default router;


import express from "express";
import OkexService from "../Services/Okex_Service.js";
import HuobiService from "../Services/Huobi_Service.js"
import BinanceService from "../Services/Binance_Service.js";
import sendLogs from "../Log_System/sendLogs.js";
import TokoCrypto from "../Remaining_Services/TokoCrypto.js";
import kucoin_Service from "../Remaining_Services/Kucoin_Service.js";
import Kucoin_Future from "../Remaining_Services/Kucoin_Future.js";
import Kraken from "../Remaining_Services/Kraken_Service.js";
import Crypto from "../Remaining_Services/Crypto_Service.js";
import Indodax_Services from "../Remaining_Services/Indodax_Service.js";
import BitFinex_Service from "../Remaining_Services/BitFinex_Service.js";
import Gate_Service from "../Remaining_Services/Gate_Service.js";
import CoinBase_Service from "../Remaining_Services/CoinBase.js";

const router = express.Router();

const userName = process.env.USER_NAME;


const routes = [

      //ROUTES FOR OKEX_SERVICE.... 

    { path: "/Okex-Service/trial", handler: (req, res) => res.send("Hello from Router!") },
    { path: "/Okex-Service/balance", handler: async (req, res) => {
        try {
            const balance = await OkexService.fetchBalanceFromExchange();
            res.json(balance);
        } catch (error) {
            //LOG ERROR...
            await sendLogs.exchangeDebug.debug(error.message, "/Okex-Service/balance", userName);
            console.error("Error fetching balance:", error.message);
            res.status(500).json({ error: "Failed to fetch balance" });
        }
    }},
    { path: "/Okex-Service/place-order", handler: async (req, res) => {
        try {
            const PlaceOrder = await OkexService.placeOrderOnExchange();
            res.json(PlaceOrder);
        } catch (error) {
            //LOG ERROR...
            await sendLogs.exchangeDebug.debug(error.message, "/Okex-Service/place-order", userName);
            console.error("Error placing order:", error.message);
            res.status(500).json({ error: "Failed to place order" });
        }
    }},
    { path: "/Okex-Service/cancel-order", handler: async (req, res) => {
        try {
            const CancelOrder = await OkexService.cancelOrderFromExchange();
            res.json(CancelOrder);
        } catch (error) {
            //LOG ERROR...
            await sendLogs.exchangeDebug.debug(error.message, "/Okex-Service/cancel-order", userName);
            console.error("Error canceling order:", error.message);
            res.status(500).json({ error: "Failed to cancel order" });
        }
    }},
    { path: "/Okex-Service/fetch-order", handler: async (req, res) => {
        try {
            const FetchOrder = await OkexService.fetchOrderFromExchange();
            res.json(FetchOrder);
        } catch (error) {
            //LOG ERROR...
            await sendLogs.exchangeDebug.debug(error.message, "/Okex-Service/fetch-order", userName);
            console.error("Error fetching order:", error.message);
            res.status(500).json({ error: "Failed to fetch order" });
        }
    }},
    { path: "/Okex-Service/trades", handler: async (req, res) => {
        try {
            const Trades = await OkexService.loadTradesForClosedOrder();
            res.json(Trades);
        } catch (error) {
            //LOG ERROR...
            await sendLogs.exchangeDebug.debug(error.message, "/Okex-Service/trades", userName);
            console.error("Error fetching trades:", error.message);
            res.status(500).json({ error: "Failed to fetch trades" });
        }
    }},
    { path: "/Okex-Service/Klines", handler: async (req, res) => {
        try {
            const Klines = await OkexService.fetchKlines();
            res.json(Klines);
        } catch (error) {
            //LOG ERROR...
            await sendLogs.exchangeDebug.debug(error.message, "/Okex-Service/Klines", userName);
            console.error("Error fetching Klines:", error.message);
            res.status(500).json({ error: "Failed to fetch Klines" });
        }
    }},
    { path: "/Okex-Service/pending-order", handler: async (req, res) => {
        try {
            const order = await OkexService.pendingOrders();
            res.json(order);
        } catch (error) {
            //LOG ERROR...
            await sendLogs.exchangeDebug.debug(error.message, "/Okex-Service/pending-order", userName);
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
          //LOG ERROR...
          await sendLogs.exchangeDebug.debug(error.message, "/Huobi-Service/account", userName);
          console.error("Error fetching Account-Details:", error.message);
          res.status(500).json({ error: "Failed to fetch Account-Details" });
      }
  }},
  { path: "/Huobi-Service/account-value", handler: async (req, res) => {
      try {
          const PlaceOrder = await HuobiService.accountValue();
          res.json(PlaceOrder);
      } catch (error) {
          //LOG ERROR...
          await sendLogs.exchangeDebug.debug(error.message, "/Huobi-Service/account-value", userName);
          console.error("Error fetching Account-Value:", error.message);
          res.status(500).json({ error: "Error fetching Account-Value:" });
      }
  }},
  { path: "/Huobi-Service/balance", handler: async (req, res) => {
      try {
          const CancelOrder = await HuobiService.fetchBalanceOnExchange();
          res.json(CancelOrder);
      } catch (error) {
          //LOG ERROR...
          await sendLogs.exchangeDebug.debug(error.message, "/Huobi-Service/balance", userName);
          console.error("Error Fetching Balance:", error.message);
          res.status(500).json({ error: "Failed to Fetch Balance" });
      }
  }},
  { path: "/Huobi-Service/place-order", handler: async (req, res) => {
      try {
          const FetchOrder = await HuobiService.placeOrderOnExchange();
          res.json(FetchOrder);
      } catch (error) {
          //LOG ERROR...
          await sendLogs.exchangeDebug.debug(error.message, "/Huobi-Service/place-order", userName);
          console.error("Error Placing an  order:", error.message);
          res.status(500).json({ error: "Failed to place an order" });
      }
  }},
  { path: "/Huobi-Service/pending-order", handler: async (req, res) => {
      try {
          const Trades = await HuobiService.pendingOrders();
          res.json(Trades);
      } catch (error) {
          //LOG ERROR...
          await sendLogs.exchangeDebug.debug(error.message, "/Huobi-Service/pending-order", userName);
          console.error("Error fetching Pending-Orders:", error.message);
          res.status(500).json({ error: "Failed to fetch Pending-Orders" });
      }
  }},
  { path: "/Huobi-Service/cancel-order", handler: async (req, res) => {
      try {
          const Klines = await HuobiService.cancelOrderOnExchange();
          res.json(Klines);
      } catch (error) {
          //LOG ERROR...
          await sendLogs.exchangeDebug.debug(error.message, "/Huobi-Service/cancel-order", userName);
          console.error("Error Cancelling Order:", error.message);
          res.status(500).json({ error: "Failed to Cancel order" });
      }
  }},
  { path: "/Huobi-Service/fetch-order", handler: async (req, res) => {
      try {
          const order = await HuobiService.fetchOrderFromExchange();
          res.json(order);
      } catch (error) {
          //LOG ERROR...
          await sendLogs.exchangeDebug.debug(error.message, "/Huobi-Service/fetch-order", userName);
          console.error("Error fetching order details:", error.message);
          res.status(500).json({ error: "Failed to fetch order details" });
      }
  }},
  { path: "/Huobi-Service/trades", handler: async (req, res) => {
    try {
        const Klines = await HuobiService.loadTradesForClosedOrder();
        res.json(Klines);
    } catch (error) {
        //LOG ERROR...
        await sendLogs.exchangeDebug.debug(error.message, "/Huobi-Service/trades", userName);
        console.error("Error fetching Trades:", error.message);
        res.status(500).json({ error: "Failed to fetch Trades" });
    }
}},
{ path: "/Huobi-Service/klines", handler: async (req, res) => {
    try {
        const order = await HuobiService.fetchKlines();
        res.json(order);
    } catch (error) {
        console.log("Caught error:", error);
        await sendLogs.exchangeDebug.debug(error.message, "/Huobi-Service/Klines", userName);
        console.error("Error fetching Klines:", error.message);
        res.status(500).json({ error: "Failed to fetch Klines" });
    }
}},

                    //ROUTES FOR BINANCE SERVICES......

        { path: "/Binance-Service/balance", handler: async (req, res) => {
            try {
                const order = await BinanceService.fetchBalanceOnExchange();
                res.json(order);
            } catch (error) {
                //LOG ERROR...
                await sendLogs.exchangeDebug.debug(error.message, "/Binance-Service/balance", userName);
                console.error("Error fetching balance details:", error.message);
                res.status(500).json({ error: "Failed to fetch balance details" });
            }
        }},

        { path: "/Binance-Service/place-order", handler: async (req, res) => {
            try {
                const order = await BinanceService.placeOrderOnExchange();
                res.json(order);
            } catch (error) {
                //LOG ERROR...
                await sendLogs.exchangeDebug.debug(error.message, "/Binance-Service/place-order", userName);
                console.error("Error placing an order:", error.message);
                res.status(500).json({ error: "Failed to place an order" });
            }
        }},

        { path: "/Binance-Service/pending-order", handler: async (req, res) => {
            try {
                const order = await BinanceService.pendingOrders();
                res.json(order);
            } catch (error) {
                //LOG ERROR...
                await sendLogs.exchangeDebug.debug(error.message, "/Binance-Service/pending-order", userName);
                console.error("Error fetching pending order details:", error.message);
                res.status(500).json({ error: "Failed to fetch pending order details" });
            }
        }},

        { path: "/Binance-Service/cancel-order", handler: async (req, res) => {
            try {
                const order = await BinanceService.cancelOrderFromExchange();
                res.json(order);
            } catch (error) {
                //LOG ERROR...
                await sendLogs.exchangeDebug.debug(error.message, "/Binance-Service/cancel-order", userName);
                console.error("Error cancelling order:", error.message);
                res.status(500).json({ error: "Failed to cancel an order" });
            }
        }},

        { path: "/Binance-Service/fetch-order", handler: async (req, res) => {
            try {
                const order = await BinanceService.fetchOrderFromExchange();
                res.json(order);
            } catch (error) {
                //LOG ERROR...
                await sendLogs.exchangeDebug.debug(error.message, "/Binance-Service/fetch-order", userName);
                console.error("Error fetching order details:", error.message);
                res.status(500).json({ error: "Failed to fetch order details" });
            }
        }},

        { path: "/Binance-Service/trades", handler: async (req, res) => {
            try {
                const order = await BinanceService.loadTradesForClosedOrder();
                res.json(order);
            } catch (error) {
                //LOG ERROR...
                await sendLogs.exchangeDebug.debug(error.message, "/Binance-Service/trades", userName);
                console.error("Error fetching trades:", error.message);
                res.status(500).json({ error: "Failed to fetch trades" });
            }
        }},

        { path: "/Binance-Service/klines", handler: async (req, res) => {
            try {
                const order = await BinanceService.fetchKlines();
                res.json(order);
            } catch (error) {
                //LOG ERROR...
                await sendLogs.exchangeDebug.debug(error.message, "/Binance-Service/Klines", userName);
                console.error("Error fetching Kline details:", error.message);
                res.status(500).json({ error: "Failed to fetch Kline details" });
            }
        }},


                            //ROUTES FOR BINANCE SERVICES......

        { path: "/Binance-Service/balance", handler: async (req, res) => {
            try {
                const order = await BinanceService.fetchBalanceOnExchange();
                res.json(order);
            } catch (error) {
                //LOG ERROR...
                await sendLogs.exchangeDebug.debug(error.message, "/Binance-Service/balance", userName);
                console.error("Error fetching balance details:", error.message);
                res.status(500).json({ error: "Failed to fetch balance details" });
            }
        }},

        { path: "/Binance-Service/place-order", handler: async (req, res) => {
            try {
                const order = await BinanceService.placeOrderOnExchange();
                res.json(order);
            } catch (error) {
                //LOG ERROR...
                await sendLogs.exchangeDebug.debug(error.message, "/Binance-Service/place-order", userName);
                console.error("Error placing an order:", error.message);
                res.status(500).json({ error: "Failed to place an order" });
            }
        }},

        { path: "/Binance-Service/pending-order", handler: async (req, res) => {
            try {
                const order = await BinanceService.pendingOrders();
                res.json(order);
            } catch (error) {
                //LOG ERROR...
                await sendLogs.exchangeDebug.debug(error.message, "/Binance-Service/pending-order", userName);
                console.error("Error fetching pending order details:", error.message);
                res.status(500).json({ error: "Failed to fetch pending order details" });
            }
        }},

        { path: "/Binance-Service/cancel-order", handler: async (req, res) => {
            try {
                const order = await BinanceService.cancelOrderFromExchange();
                res.json(order);
            } catch (error) {
                //LOG ERROR...
                await sendLogs.exchangeDebug.debug(error.message, "/Binance-Service/cancel-order", userName);
                console.error("Error cancelling order:", error.message);
                res.status(500).json({ error: "Failed to cancel an order" });
            }
        }},

        { path: "/Binance-Service/fetch-order", handler: async (req, res) => {
            try {
                const order = await BinanceService.fetchOrderFromExchange();
                res.json(order);
            } catch (error) {
                //LOG ERROR...
                await sendLogs.exchangeDebug.debug(error.message, "/Binance-Service/fetch-order", userName);
                console.error("Error fetching order details:", error.message);
                res.status(500).json({ error: "Failed to fetch order details" });
            }
        }},

        { path: "/Binance-Service/trades", handler: async (req, res) => {
            try {
                const order = await BinanceService.loadTradesForClosedOrder();
                res.json(order);
            } catch (error) {
                //LOG ERROR...
                await sendLogs.exchangeDebug.debug(error.message, "/Binance-Service/trades", userName);
                console.error("Error fetching trades:", error.message);
                res.status(500).json({ error: "Failed to fetch trades" });
            }
        }},

        { path: "/Binance-Service/klines", handler: async (req, res) => {
            try {
                const order = await BinanceService.fetchKlines();
                res.json(order);
            } catch (error) {
                //LOG ERROR...
                await sendLogs.exchangeDebug.debug(error.message, "/Binance-Service/Klines", userName);
                console.error("Error fetching Kline details:", error.message);
                res.status(500).json({ error: "Failed to fetch Kline details" });
            }
        }},


                    //ROUTES FOR TOKO-CRYPTO SERVICES......

                    { path: "/Toko-Service/balance", handler: async (req, res) => {
                        try {
                            const order = await TokoCrypto.fetchBalanceOnExchange();
                            res.json(order);
                        } catch (error) {
                            //LOG ERROR...
                            await sendLogs.exchangeDebug.debug(error.message, "/Toko-Service/balance", userName);
                            console.error("Error fetching balance details:", error.message);
                            res.status(500).json({ error: "Failed to fetch balance details" });
                        }
                    }},
            
                    { path: "/Toko-Service/place-order", handler: async (req, res) => {
                        try {
                            const order = await TokoCrypto.placeOrderOnExchange();
                            res.json(order);
                        } catch (error) {
                            //LOG ERROR...
                            await sendLogs.exchangeDebug.debug(error.message, "/Toko-Service/place-order", userName);
                            console.error("Error placing an order:", error.message);
                            res.status(500).json({ error: "Failed to place an order" });
                        }
                    }},
            
                    { path: "/Toko-Service/pending-order", handler: async (req, res) => {
                        try {
                            const order = await TokoCrypto.pendingOrders();
                            res.json(order);
                        } catch (error) {
                            //LOG ERROR...
                            await sendLogs.exchangeDebug.debug(error.message, "/Toko-Service/pending-order", userName);
                            console.error("Error fetching pending order details:", error.message);
                            res.status(500).json({ error: "Failed to fetch pending order details" });
                        }
                    }},
            
                    { path: "/Toko-Service/cancel-order", handler: async (req, res) => {
                        try {
                            const order = await TokoCrypto.cancelOrderFromExchange();
                            res.json(order);
                        } catch (error) {
                            //LOG ERROR...
                            await sendLogs.exchangeDebug.debug(error.message, "/Toko-Service/cancel-order", userName);
                            console.error("Error cancelling order:", error.message);
                            res.status(500).json({ error: "Failed to cancel an order" });
                        }
                    }},
            
                    { path: "/Toko-Service/fetch-order", handler: async (req, res) => {
                        try {
                            const order = await TokoCrypto.fetchOrderFromExchange();
                            res.json(order);
                        } catch (error) {
                            //LOG ERROR...
                            await sendLogs.exchangeDebug.debug(error.message, "/Toko-Service/fetch-order", userName);
                            console.error("Error fetching order details:", error.message);
                            res.status(500).json({ error: "Failed to fetch order details" });
                        }
                    }},
            
                    { path: "/Toko-Service/trades", handler: async (req, res) => {
                        try {
                            const order = await TokoCrypto.loadTradesForClosedOrder();
                            res.json(order);
                        } catch (error) {
                            //LOG ERROR...
                            await sendLogs.exchangeDebug.debug(error.message, "/Toko-Service/trades", userName);
                            console.error("Error fetching trades:", error.message);
                            res.status(500).json({ error: "Failed to fetch trades" });
                        }
                    }},
            
                    { path: "/Toko-Service/klines", handler: async (req, res) => {
                        try {
                            const order = await TokoCrypto.fetchKlines();
                            res.json(order);
                        } catch (error) {
                            //LOG ERROR...
                            await sendLogs.exchangeDebug.debug(error.message, "/Toko-Service/Klines", userName);
                            console.error("Error fetching Kline details:", error.message);
                            res.status(500).json({ error: "Failed to fetch Kline details" });
                        }
                    }},




                                       //ROUTES FOR KUCOIN SERVICES......

                                       { path: "/Kucoin-Service/balance", handler: async (req, res) => {
                                        try {
                                            const order = await kucoin_Service.fetchBalanceOnExchange();
                                            res.json(order);
                                        } catch (error) {
                                            console.error("Error fetching balance details:", error.message);
                                            res.status(500).json({ error: "Failed to fetch balance details" });
                                        }
                                    }},
                            
                                    { path: "/Kucoin-Service/place-order", handler: async (req, res) => {
                                        try {
                                            const order = await kucoin_Service.placeOrderOnExchange();
                                            res.json(order);
                                        } catch (error) {
                                            console.error("Error placing an order:", error.message);
                                            res.status(500).json({ error: "Failed to place an order" });
                                        }
                                    }},
                            
                                    { path: "/Kucoin-Service/pending-order", handler: async (req, res) => {
                                        try {
                                            const order = await kucoin_Service.pendingOrders();
                                            res.json(order);
                                        } catch (error) {
                                            console.error("Error fetching pending order details:", error.message);
                                            res.status(500).json({ error: "Failed to fetch pending order details" });
                                        }
                                    }},
                            
                                    { path: "/Kucoin-Service/cancel-order", handler: async (req, res) => {
                                        try {
                                            const order = await kucoin_Service.cancelOrderFromExchange();
                                            res.json(order);
                                        } catch (error) {
                                            console.error("Error cancelling order:", error.message);
                                            res.status(500).json({ error: "Failed to cancel an order" });
                                        }
                                    }},
                            
                                    { path: "/Kucoin-Service/fetch-order", handler: async (req, res) => {
                                        try {
                                            const order = await kucoin_Service.fetchOrderFromExchange();
                                            res.json(order);
                                        } catch (error) {
                                            console.error("Error fetching order details:", error.message);
                                            res.status(500).json({ error: "Failed to fetch order details" });
                                        }
                                    }},
                            
                                    { path: "/Kucoin-Service/trades", handler: async (req, res) => {
                                        try {
                                            const order = await kucoin_Service.loadTradesForClosedOrder();
                                            res.json(order);
                                        } catch (error) {
                                            console.error("Error fetching trades:", error.message);
                                            res.status(500).json({ error: "Failed to fetch trades" });
                                        }
                                    }},
                            
                                    { path: "/Kucoin-Service/klines", handler: async (req, res) => {
                                        try {
                                            const order = await kucoin_Service.fetchKlines();
                                            res.json(order);
                                        } catch (error) {
                                            console.error("Error fetching Kline details:", error.message);
                                            res.status(500).json({ error: "Failed to fetch Kline details" });
                                        }
                                    }},


                                    //Routes For Kucoin Future.
                                    { path: "/Kucoin-Future/place-order", handler: async (req, res) => {
                                        try {
                                            const order = await Kucoin_Future.placeOrderOnExchange();
                                            res.json(order);
                                        } catch (error) {
                                            console.error("Error placing an order:", error.message);
                                            res.status(500).json({ error: "Failed to place an order" });
                                        }
                                    }},
                            
                                    { path: "/Kucoin-Future/pending-order", handler: async (req, res) => {
                                        try {
                                            const order = await Kucoin_Future.pendingOrders();
                                            res.json(order);
                                        } catch (error) {
                                            console.error("Error fetching pending order details:", error.message);
                                            res.status(500).json({ error: "Failed to fetch pending order details" });
                                        }
                                    }},
                            
                                    { path: "/Kucoin-Future/cancel-order", handler: async (req, res) => {
                                        try {
                                            const order = await Kucoin_Future.cancelOrderFromExchange();
                                            res.json(order);
                                        } catch (error) {
                                            console.error("Error cancelling order:", error.message);
                                            res.status(500).json({ error: "Failed to cancel an order" });
                                        }
                                    }},
                            
                                    { path: "/Kucoin-Future/fetch-order", handler: async (req, res) => {
                                        try {
                                            const order = await Kucoin_Future.fetchOrderFromExchange();
                                            res.json(order);
                                        } catch (error) {
                                            console.error("Error fetching order details:", error.message);
                                            res.status(500).json({ error: "Failed to fetch order details" });
                                        }
                                    }},
                            
                                    { path: "/Kucoin-Future/trades", handler: async (req, res) => {
                                        try {
                                            const order = await Kucoin_Future.loadTradesForClosedOrder();
                                            res.json(order);
                                        } catch (error) {
                                            console.error("Error fetching trades:", error.message);
                                            res.status(500).json({ error: "Failed to fetch trades" });
                                        }
                                    }},
                            
                                    { path: "/Kucoin-Future/klines", handler: async (req, res) => {
                                        try {
                                            const order = await Kucoin_Future.fetchKlines();
                                            res.json(order);
                                        } catch (error) {
                                            console.error("Error fetching Kline details:", error.message);
                                            res.status(500).json({ error: "Failed to fetch Kline details" });
                                        }
                                    }},




                                        //Routes For Indodax Service.
                                        { path: "/Indo-Service/balance", handler: async (req, res) => {
                                            try {
                                                const order = await Indodax_Services.fetchBalanceOnExchange();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error Fetching balance:", error.message);
                                                res.status(500).json({ error: "Failed to Fetching balance:" });
                                            }
                                        }},

                                        { path: "/Indo-Service/place-order", handler: async (req, res) => {
                                            try {
                                                const order = await Indodax_Services.placeOrderOnExchange();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error placing an order:", error.message);
                                                res.status(500).json({ error: "Failed to place an order" });
                                            }
                                        }},
                                
                                        { path: "/Indo-Service/pending-order", handler: async (req, res) => {
                                            try {
                                                const order = await Indodax_Services.pendingOrders();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error fetching pending order details:", error.message);
                                                res.status(500).json({ error: "Failed to fetch pending order details" });
                                            }
                                        }},
                                
                                        { path: "/Indo-Service/cancel-order", handler: async (req, res) => {
                                            try {
                                                const order = await Indodax_Services.cancelOrderFromExchange();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error cancelling order:", error.message);
                                                res.status(500).json({ error: "Failed to cancel an order" });
                                            }
                                        }},
                                
                                        { path: "/Indo-Service/fetch-order", handler: async (req, res) => {
                                            try {
                                                const order = await Indodax_Services.fetchOrderFromExchange();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error fetching order details:", error.message);
                                                res.status(500).json({ error: "Failed to fetch order details" });
                                            }
                                        }},
                                
                                        { path: "/Indo-Service/trades", handler: async (req, res) => {
                                            try {
                                                const order = await Indodax_Services.loadTradesForClosedOrder();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error fetching trades:", error.message);
                                                res.status(500).json({ error: "Failed to fetch trades" });
                                            }
                                        }},
                                
                                        { path: "/Indo-Service/klines", handler: async (req, res) => {
                                            try {
                                                const order = await Indodax_Services.fetchKlines();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error fetching Kline details:", error.message);
                                                res.status(500).json({ error: "Failed to fetch Kline details" });
                                            }
                                        }},


                                        //Routes For Kraken Service.
                                        { path: "/Kraken-Service/balance", handler: async (req, res) => {
                                            try {
                                                const order = await Kraken.fetchBalanceOnExchange();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error Fetching balance:", error.message);
                                                res.status(500).json({ error: "Failed to Fetching balance:" });
                                            }
                                        }},

                                        { path: "/Kraken-Service/place-order", handler: async (req, res) => {
                                            try {
                                                const order = await Kraken.placeOrderOnExchange();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error placing an order:", error.message);
                                                res.status(500).json({ error: "Failed to place an order" });
                                            }
                                        }},
                                
                                        { path: "/Kraken-Service/pending-order", handler: async (req, res) => {
                                            try {
                                                const order = await Kraken.pendingOrders();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error fetching pending order details:", error.message);
                                                res.status(500).json({ error: "Failed to fetch pending order details" });
                                            }
                                        }},
                                
                                        { path: "/Kraken-Service/cancel-order", handler: async (req, res) => {
                                            try {
                                                const order = await Kraken.cancelOrderFromExchange();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error cancelling order:", error.message);
                                                res.status(500).json({ error: "Failed to cancel an order" });
                                            }
                                        }},
                                
                                        { path: "/Kraken-Service/fetch-order", handler: async (req, res) => {
                                            try {
                                                const order = await Kraken.fetchOrderFromExchange();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error fetching order details:", error.message);
                                                res.status(500).json({ error: "Failed to fetch order details" });
                                            }
                                        }},
                                
                                        { path: "/Kraken-Service/trades", handler: async (req, res) => {
                                            try {
                                                const order = await Kraken.loadTradesForClosedOrder();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error fetching trades:", error.message);
                                                res.status(500).json({ error: "Failed to fetch trades" });
                                            }
                                        }},
                                
                                        { path: "/Kraken-Service/klines", handler: async (req, res) => {
                                            try {
                                                const order = await Kraken.fetchKlines();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error fetching Kline details:", error.message);
                                                res.status(500).json({ error: "Failed to fetch Kline details" });
                                            }
                                        }},


                                        //Routes For Kraken Service.
                                        { path: "/Gate-Service/balance", handler: async (req, res) => {
                                            try {
                                                const order = await Gate_Service.fetchBalanceOnExchange();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error Fetching balance:", error.message);
                                                res.status(500).json({ error: "Failed to Fetching balance:" });
                                            }
                                        }},

                                        { path: "/Gate-Service/place-order", handler: async (req, res) => {
                                            try {
                                                const order = await Gate_Service.placeOrderOnExchange();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error placing an order:", error.message);
                                                res.status(500).json({ error: "Failed to place an order" });
                                            }
                                        }},
                                
                                        { path: "/Gate-Service/pending-order", handler: async (req, res) => {
                                            try {
                                                const order = await Gate_Service.pendingOrders();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error fetching pending order details:", error.message);
                                                res.status(500).json({ error: "Failed to fetch pending order details" });
                                            }
                                        }},
                                
                                        { path: "/Gate-Service/cancel-order", handler: async (req, res) => {
                                            try {
                                                const order = await Gate_Service.cancelOrderFromExchange();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error cancelling order:", error.message);
                                                res.status(500).json({ error: "Failed to cancel an order" });
                                            }
                                        }},
                                
                                        { path: "/Gate-Service/fetch-order", handler: async (req, res) => {
                                            try {
                                                const order = await Gate_Service.fetchOrderFromExchange();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error fetching order details:", error.message);
                                                res.status(500).json({ error: "Failed to fetch order details" });
                                            }
                                        }},
                                
                                        { path: "/Gate-Service/trades", handler: async (req, res) => {
                                            try {
                                                const order = await Gate_Service.loadTradesForClosedOrder();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error fetching trades:", error.message);
                                                res.status(500).json({ error: "Failed to fetch trades" });
                                            }
                                        }},
                                
                                        { path: "/Gate-Service/klines", handler: async (req, res) => {
                                            try {
                                                const order = await Gate_Service.fetchKlines();
                                                res.json(order);
                                            } catch (error) {
                                                console.error("Error fetching Kline details:", error.message);
                                                res.status(500).json({ error: "Failed to fetch Kline details" });
                                            }
                                        }},


                                            //Routes For BitFinex Service.
                                            { path: "/BitFinex-Service/balance", handler: async (req, res) => {
                                                try {
                                                    const order = await BitFinex_Service.fetchBalanceOnExchange();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error Fetching balance:", error.message);
                                                    res.status(500).json({ error: "Failed to Fetching balance:" });
                                                }
                                            }},
    
                                            { path: "/BitFinex-Service/place-order", handler: async (req, res) => {
                                                try {
                                                    const order = await BitFinex_Service.placeOrderOnExchange();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error placing an order:", error.message);
                                                    res.status(500).json({ error: "Failed to place an order" });
                                                }
                                            }},
                                    
                                            { path: "/BitFinex-Service/pending-order", handler: async (req, res) => {
                                                try {
                                                    const order = await BitFinex_Service.pendingOrders();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error fetching pending order details:", error.message);
                                                    res.status(500).json({ error: "Failed to fetch pending order details" });
                                                }
                                            }},
                                    
                                            { path: "/BitFinex-Service/cancel-order", handler: async (req, res) => {
                                                try {
                                                    const order = await BitFinex_Service.cancelOrderFromExchange();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error cancelling order:", error.message);
                                                    res.status(500).json({ error: "Failed to cancel an order" });
                                                }
                                            }},
                                            
                                            { path: "/BitFinex-Service/fetch-order", handler: async (req, res) => {
                                                try {
                                                    const order = await BitFinex_Service.fetchOrderFromExchange();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error fetching order details:", error.message);
                                                    res.status(500).json({ error: "Failed to fetch order details" });
                                                }
                                            }},
                                    
                                            { path: "/BitFinex-Service/trades", handler: async (req, res) => {
                                                try {
                                                    const order = await BitFinex_Service.loadTradesForClosedOrder();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error fetching trades:", error.message);
                                                    res.status(500).json({ error: "Failed to fetch trades" });
                                                }
                                            }},
                                    
                                            { path: "/BitFinex-Service/klines", handler: async (req, res) => {
                                                try {
                                                    const order = await BitFinex_Service.fetchKlines();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error fetching Kline details:", error.message);
                                                    res.status(500).json({ error: "Failed to fetch Kline details" });
                                                }
                                            }},




                                            //Routes For CoinBase_Service.

                                            { path: "/Coinbase-Service/account", handler: async (req, res) => {
                                                try {
                                                    const order = await CoinBase_Service.FetchAccount();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error Fetching Accout:", error.message);
                                                    res.status(500).json({ error: "Failed to Fetching Account:" });
                                                }
                                            }},
                                            { path: "/Coinbase-Service/balance", handler: async (req, res) => {
                                                try {
                                                    const order = await CoinBase_Service.fetchBalanceOnExchange();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error Fetching balance:", error.message);
                                                    res.status(500).json({ error: "Failed to Fetching balance:" });
                                                }
                                            }},
    
                                            { path: "/Coinbase-Service/place-order", handler: async (req, res) => {
                                                try {
                                                    const order = await CoinBase_Service.placeOrderOnExchange();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error placing an order:", error.message);
                                                    res.status(500).json({ error: "Failed to place an order" });
                                                }
                                            }},
                                    
                                            { path: "/Coinbase-Service/pending-order", handler: async (req, res) => {
                                                try {
                                                    const order = await CoinBase_Service.pendingOrders();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error fetching pending order details:", error.message);
                                                    res.status(500).json({ error: "Failed to fetch pending order details" });
                                                }
                                            }},
                                    
                                            { path: "/Coinbase-Service/cancel-order", handler: async (req, res) => {
                                                try {
                                                    const order = await CoinBase_Service.cancelOrderFromExchange();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error cancelling order:", error.message);
                                                    res.status(500).json({ error: "Failed to cancel an order" });
                                                }
                                            }},
                                    
                                            { path: "/Coinbase-Service/fetch-order", handler: async (req, res) => {
                                                try {
                                                    const order = await CoinBase_Service.fetchOrderFromExchange();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error fetching order details:", error.message);
                                                    res.status(500).json({ error: "Failed to fetch order details" });
                                                }
                                            }},
                                    
                                            { path: "/Coinbase-Service/trades", handler: async (req, res) => {
                                                try {
                                                    const order = await CoinBase_Service.loadTradesForClosedOrder();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error fetching trades:", error.message);
                                                    res.status(500).json({ error: "Failed to fetch trades" });
                                                }
                                            }},
                                    
                                            { path: "/Coinbase-Service/klines", handler: async (req, res) => {
                                                try {
                                                    const order = await CoinBase_Service.fetchKlines();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error fetching Kline details:", error.message);
                                                    res.status(500).json({ error: "Failed to fetch Kline details" });
                                                }
                                            }},






                                            //Testing for Crypto..
                                            { path: "/crypto/checking", handler: async (req, res) => {
                                                try {
                                                    const order = await Crypto.fetchOrderFromExchange();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error Kraken", error.message);
                                                    res.status(500).json({ error: "Error Kraken ISE", error });
                                                }
                                            }},


                                            //Routes For BitFinex Service.
                                            { path: "/crypto-Service/balance", handler: async (req, res) => {
                                                try {
                                                    const order = await Crypto.fetchBalanceOnExchange();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error Fetching balance:", error.message);
                                                    res.status(500).json({ error: "Failed to Fetching balance:" });
                                                }
                                            }},
    
                                            { path: "/crypto-Service/place-order", handler: async (req, res) => {
                                                try {
                                                    const order = await Crypto.placeOrderOnExchange();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error placing an order:", error.message);
                                                    res.status(500).json({ error: "Failed to place an order" });
                                                }
                                            }},
                                    
                                            { path: "/crypto-Service/pending-order", handler: async (req, res) => {
                                                try {
                                                    const order = await Crypto.pendingOrders();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error fetching pending order details:", error.message);
                                                    res.status(500).json({ error: "Failed to fetch pending order details" });
                                                }
                                            }},
                                    
                                            { path: "/crypto-Service/cancel-order", handler: async (req, res) => {
                                                try {
                                                    const order = await Crypto.cancelOrderFromExchange();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error cancelling order:", error.message);
                                                    res.status(500).json({ error: "Failed to cancel an order" });
                                                }
                                            }},
                                    
                                            { path: "/crypto-Service/fetch-order", handler: async (req, res) => {
                                                try {
                                                    const order = await Crypto.fetchOrderFromExchange();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error fetching order details:", error.message);
                                                    res.status(500).json({ error: "Failed to fetch order details" });
                                                }
                                            }},
                                    
                                            { path: "/crypto-Service/trades", handler: async (req, res) => {
                                                try {
                                                    const order = await Crypto.loadTradesForClosedOrder();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error fetching trades:", error.message);
                                                    res.status(500).json({ error: "Failed to fetch trades" });
                                                }
                                            }},
                                    
                                            { path: "/crypto-Service/klines", handler: async (req, res) => {
                                                try {
                                                    const order = await Crypto.fetchKlines();
                                                    res.json(order);
                                                } catch (error) {
                                                    console.error("Error fetching Kline details:", error.message);
                                                    res.status(500).json({ error: "Failed to fetch Kline details" });
                                                }
                                            }},


                
];




routes.forEach(route => router.get(route.path, route.handler));

export default router;


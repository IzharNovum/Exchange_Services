class NonCcxtExchangeService{



/**
 * [
 *  {
 *    "baseQty": "0.12473377",
 *    "buyer": true,
 *    "commission": "0.00006236",
 *    "commissionAsset": "BNB",
 *    "id": 264892,
 *    "maker": false,
 *    "marginAsset": "BNB",
 *    "orderId": 50897185,
 *    "pair": "BNBUSD",
 *    "positionSide": "BOTH",
 *    "price": "320.683",
 *    "qty": "4",
 *    "realizedPnl": "0",
 *    "side": "BUY",
 *    "symbol": "BNBUSD_230331",
 *    "time": 1667933655423
 *  }
 * ]
 */

  static    convertTradesToCcxtFormat(trades) {
    const ccxtTrades = trades.map(trade => ({
        order: trade.orderId,
        amount: trade.qty,
        baseQty: trade.baseQty || 0,
        fee: {
            currency: trade.commissionAsset,
            cost: Math.abs(trade.commission)
        }
    }));

    return ccxtTrades;
}


}


export default NonCcxtExchangeService;
import UserBots from "./models/Userbots.js";
import UserExchange from "./models/UserExchange.js";
import Exchange from "./models/Exchange.js";
import ExchangePairModel from "./models/Exchange_Pair.js";
import PairModel from "./models/Pair.js";
import sequelize from "./DB/database.js";

import { DataTypes } from "sequelize";


/**
 * Relationships
 */
Exchange.hasMany(ExchangePairModel, { foreignKey: 'exchange_id' });
ExchangePairModel.belongsTo(Exchange, { foreignKey: 'exchange_id' });

PairModel.hasMany(ExchangePairModel, { foreignKey: 'pair_id' });
ExchangePairModel.belongsTo(PairModel, { foreignKey: 'pair_id' });

Exchange.hasMany(UserExchange, { foreignKey: 'exchange_id' });
UserExchange.belongsTo(Exchange, { foreignKey: 'exchange_id' });

ExchangePairModel.hasMany(UserBots, { foreignKey: 'exchange_pair_id' });
UserBots.belongsTo(ExchangePairModel, { foreignKey: 'exchange_pair_id' });



/**
 * CHECKS FOR CONNECTION..
 */
sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch((error) => {
    console.error('Unable to connect to the database:', error);
  });


/**
 * SYNC THE TABLES IN DB
 */
sequelize
.sync({ alert: true })
.then(() => {
  console.log("All models were synchronized successfully.");
})
.catch((error) => {
  console.error("Error synchronizing models:", error);
});

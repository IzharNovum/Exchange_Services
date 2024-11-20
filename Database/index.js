import UserBots from "./models/Userbots";
import UserExchange from "./models/UserExchange";
import Exchange from "./models/Exchange";
import ExchangePair from "./models/ExchangePair";
import Pair from "./models/Pair";




Exchange.hasMany(ExchangePair, { foreignKey: 'exchange_id' });
ExchangePair.belongsTo(Exchange, { foreignKey: 'exchange_id' });

Pair.hasMany(ExchangePair, { foreignKey: 'pair_id' });
ExchangePair.belongsTo(Pair, { foreignKey: 'pair_id' });

Exchange.hasMany(UserExchange, { foreignKey: 'exchange_id' });
UserExchange.belongsTo(Exchange, { foreignKey: 'exchange_id' });

ExchangePair.hasMany(UserBots, { foreignKey: 'exchange_pair_id' });
UserBots.belongsTo(ExchangePair, { foreignKey: 'exchange_pair_id' });

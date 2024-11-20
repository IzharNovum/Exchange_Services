import sequelize from "./database";
import{ Model, DataTypes } from "sequelize";



class ExchangePair extends Model {}

ExchangePair.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  exchange_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  pair_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
  },
  min_quantity: {
    type: DataTypes.DOUBLE,
    defaultValue: 0,
  },
  max_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  min_notional: {
    type: DataTypes.DOUBLE,
    defaultValue: 0,
  },
  price_precision: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  amount_precision: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  contract_size: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.TINYINT(1),
    defaultValue: 1,
    allowNull: false,
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  future_type: {
    type: DataTypes.ENUM('coin_m', 'usd_m', 'usd_c'),
    allowNull: true,
    defaultValue: null,
  },
}, {
  sequelize, 
  modelName: 'ExchangePair',
  tableName: 'exchange_pairs',
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  engine: 'InnoDB',
  timestamps: true, 
  paranoid: true, 
  underscored: true, 
  freezeTableName: true,
});

export default ExchangePair;
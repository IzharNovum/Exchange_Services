import { Model , DataTypes } from "sequelize";
import sequelize from '../DB/database.js';

class UserBots extends Model {}

UserBots.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  rent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: '',
  },
  checked_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
  },
  frequency: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    comment: 'minutes',
  },
  exchange_pair_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  strategy: {
    type: DataTypes.ENUM('Long', 'Short', 'Both'),
    allowNull: true,
    defaultValue: 'Long',
  },
  initial_fund: {
    type: DataTypes.DOUBLE(20, 8),
    allowNull: true,
  },
  base_order_percentage: {
    type: DataTypes.DOUBLE(20, 8),
    allowNull: true,
  },
  base_order_type: {
    type: DataTypes.ENUM('static', 'dynamic'),
    allowNull: true,
    defaultValue: 'static',
  },
  extra_order_percentage: {
    type: DataTypes.DOUBLE(20, 2).UNSIGNED,
    allowNull: false,
    comment: 'market/order',
  },
  profit: {
    type: DataTypes.DOUBLE(20, 2),
    allowNull: true,
  },
  stop_loss: {
    type: DataTypes.DOUBLE(20, 2),
    allowNull: true,
  },
  back_test_time_frame: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '365 day',
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  indicator_triggers_entry: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },
  indicator_triggers_exit: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },
  pair_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  exchange_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM(
      'simple',
      'advance',
      'dca',
      'exit',
      'price',
      'grid',
      'sell',
      'inter_arbitrage',
      'intra_arbitrage'
    ),
    allowNull: false,
    defaultValue: 'simple',
  },
  min_tp: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
  order_type: {
    type: DataTypes.ENUM('market', 'limit'),
    allowNull: false,
    defaultValue: 'market',
  },
}, {
  sequelize,
  modelName: 'UserBots',
  tableName: 'user_bots',
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  engine: 'InnoDB',
  timestamps: false, 
  paranoid: true,
  freezeTableName: true,
});


export default UserBots;
import sequelize from "../DB/database.js";
import { Model, DataTypes } from "sequelize";

class ExchangeModel extends Model {}

ExchangeModel.init(
  {
    order: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 15,
    },
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(191),
      allowNull: false,
      defaultValue: '',
    },
    image: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: null,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    status: {
      type: DataTypes.STRING(191),
      allowNull: false,
      defaultValue: "ok",
    },
    require_param: {
      type: DataTypes.STRING(191),
      allowNull: true,
      defaultValue: null,
    },
    doc_link: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    is_future: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "Exchange",
    tableName: "exchanges",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    engine: "InnoDB",
    timestamps: false, 
    paranoid: false, 
    freezeTableName: true,
  }
);

export default ExchangeModel;

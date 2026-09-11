const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Post = sequelize.define(
    'Post',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      author: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      file_path: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_published: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'posts',
      underscored: true,
      updatedAt: false,
    }
  );

  return Post;
};

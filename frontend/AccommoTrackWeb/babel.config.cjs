const transformImportMetaEnvForJest = ({ types: t }) => ({
  name: 'transform-import-meta-env-for-jest',
  visitor: {
    MemberExpression(path) {
      const objectPath = path.get('object');

      if (!objectPath.isMemberExpression()) {
        return;
      }

      const importMetaPath = objectPath.get('object');
      const envPath = objectPath.get('property');
      const keyPath = path.get('property');

      if (!importMetaPath.isMetaProperty()) {
        return;
      }

      if (
        importMetaPath.node.meta.name !== 'import' ||
        importMetaPath.node.property.name !== 'meta' ||
        !envPath.isIdentifier({ name: 'env' }) ||
        !keyPath.isIdentifier()
      ) {
        return;
      }

      path.replaceWith(
        t.memberExpression(
          t.memberExpression(t.identifier('process'), t.identifier('env')),
          t.identifier(keyPath.node.name),
        ),
      );
    },
  },
});

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: [transformImportMetaEnvForJest],
};

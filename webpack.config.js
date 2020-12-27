const webpack = require('webpack');
const path = require('path');

const src  = path.resolve(__dirname, 'src');
const dist = path.resolve(__dirname, 'docs');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = () => ({
    entry: `${src}/index.js`,

    cache: {
        type: 'filesystem',
        buildDependencies: {
            config: [__filename]
        }
    },

    output: {
        path: dist,
        filename: 'bundle.js',
    },

    module: {
        rules: [
            {
                test: /\.vue$/,
                use: [
                    {
                        loader: 'vue-loader',
                    }
                ]
            },
            {
                test: /\.(glsl|vert|frag)$/,
                exclude: /\.(njk|nunjucks)\.(glsl|vert|frag)$/,
                use: [
                    {
                        loader: 'shader-loader',
                    }
                ]
            },
            {
                test: /\.(njk|nunjucks)\.(glsl|vert|frag)$/,
                loader: 'nunjucks-loader',
                // query: {
                //     root: `${__dirname}/src`,
                // },
            },
            {
                test: /\.js$/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [['@babel/preset-env', { modules: false }]]
                        }
                    }
                ]
            },
            {
                test: /\.png$/,
                exclude: /node_modules/,
                type: 'asset/resource'
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ],
            }
        ]
    },

    devtool: (process.env.NODE_ENV === 'production') ? false : 'inline-source-map',

    resolve: {
        extensions: ['.js'],
    },

    devServer: {
        contentBase: 'docs',
        port: 3000,
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production'),
        }),
        new VueLoaderPlugin()
    ],
});

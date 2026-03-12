const withMDX = require("@next/mdx")({
  extension: /\.mdx?$/,
  options: {},
});

/** @type {import('next').NextConfig} */
module.exports = withMDX({
  pageExtensions: ["js", "jsx", "md", "mdx"],
  turbopack: {},
});

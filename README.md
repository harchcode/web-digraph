# web-digraph
> A library to create a simple directed graph editor. See the demo at [https://web-digraph.netlify.app/](https://web-digraph.netlify.app/).

## Overview
There is a really long story about how this library ends up being created. Please just pretend you already know the story and that it makes sense.
This library is basically almost a copy of react-digraph (https://github.com/uber/react-digraph), just less features, less polished, and less everything, but using canvas instead of svg for rendering, and also not using react, because we love imperative things. React is for the weak.

## Features
- Built with Typescript.
- Small size (at least compared to react-digraph, because of no D3 dependency, and much less features).
- Imperative API and class-based (yes, this is a feature).

## Installation
_Coming soon_

## Usage
See the example directory. More detailed explanation is coming soon.

## FAQ
Q: Why not just use react-digraph if this is basically an inferior version of react-digraph?
A: Size and performance are the main reasons. React-digraph depends on D3, which is heavy. Also they use react and svg, which is not performant when the nodes and edges count are really big. Try 1000 nodes on react-digraph's example and then try 9999 nodes on web-digraph's example and you will see the difference.

Q: Why not use react?
A: I am not an expert on React. Never really liked React anyway, it's all just for the job. But I actually tried React first, with SVG. It ends up very slow on high node or edge count (maybe because of all the diffing and garbage created). Then I optimized it by using React.memo and update the component manually. It ends up looking just like imperative code, except far more complicated like our love story. So I decided to just throw React into the trash bin. And then after doing all that, I then found out about react-digraph and i feel like I just wasted my time. So I got angry and just go rewrite it without React, and use canvas to be cool and different. Btw, please don't misunderstand, I don't like Vue or Angular either. Not even newer ones like Svelte.

Q: Why not use D3?
A: The only thing I like about D3 is the utilities. Not really needed for doing this anyway. And it won't make that much difference because we are using canvas. It will just increase the size.

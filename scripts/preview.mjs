import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
http.createServer(async (req,res)=>{try{let rel=decodeURIComponent(new URL(req.url,`http://${req.headers.host}`).pathname).replace(/^\//,'')||'index.html';let file=path.join(root,rel);try{await fs.access(file)}catch{file=path.join(root,'404.html')}const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data)}catch{res.writeHead(404);res.end()}}).listen(port,()=>console.log(`Preview: http://localhost:${port}`));

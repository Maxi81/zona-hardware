# Arranca el servidor de desarrollo forzando a Node a resolver IPv4 antes
# que IPv6. En algunas redes (facultad, ciertos routers) la ruta IPv6 hacia
# Supabase esta rota o es muy lenta, y sin esto cada consulta a la base
# puede tardar 60-120+ segundos hasta que Node se rinde y cae a IPv4.
#
# Uso: en vez de "npm run dev", corre:  .\dev.ps1
$env:NODE_OPTIONS = "--dns-result-order=ipv4first"
npm run dev

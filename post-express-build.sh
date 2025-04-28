serv_index="build/server/index.js"
sed -i '' 's/react-dom\/server/react-dom\/server.browser/g' "${serv_index}"

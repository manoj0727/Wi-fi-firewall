const DNS = require('dns2');
const { Packet } = DNS;

function createDNSServer(ruleManager) {
  const server = DNS.createServer({
    udp: true,
    tcp: true,
    handle: async (request, send) => {
      const response = Packet.createResponseFromRequest(request);
      const [question] = request.questions;
      const { name } = question;

      const domain = name.toLowerCase();
      const isBlocked = await ruleManager.isBlocked(domain);

      if (isBlocked) {
        response.answers.push({
          name,
          type: Packet.TYPE.A,
          class: Packet.CLASS.IN,
          ttl: 300,
          address: '0.0.0.0'
        });

        await ruleManager.logAccess(domain, 'BLOCKED');
      } else {
        const resolver = new DNS.Resolver();
        resolver.setServers([process.env.UPSTREAM_DNS || '8.8.8.8']);

        try {
          const result = await resolver.resolveA(name);
          result.forEach(ip => {
            response.answers.push({
              name,
              type: Packet.TYPE.A,
              class: Packet.CLASS.IN,
              ttl: 300,
              address: ip
            });
          });

          await ruleManager.logAccess(domain, 'ALLOWED');
        } catch (error) {
          console.error(`DNS resolution error for ${name}:`, error.message);
        }
      }

      send(response);
    }
  });

  server.on('request', (request, response, client) => {
    console.log(`DNS request from ${client.address} for ${request.questions[0].name}`);
  });

  const dnsPort = parseInt(process.env.DNS_PORT || 53);
  server.listen({ udp: dnsPort, tcp: dnsPort });

  return server;
}

module.exports = { createDNSServer };
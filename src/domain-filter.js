class DomainFilter {
  constructor() {
    this.rules = new Map();
    this.wildcardRules = new Set();
  }

  addRule(domain, action = 'block') {
    if (domain.includes('*')) {
      const regex = domain.replace(/\./g, '\\.').replace(/\*/g, '.*');
      this.wildcardRules.add({ regex: new RegExp(`^${regex}$`), action, domain });
    } else {
      this.rules.set(domain, action);
    }
  }

  removeRule(domain) {
    if (domain.includes('*')) {
      this.wildcardRules = new Set([...this.wildcardRules].filter(r => r.domain !== domain));
    } else {
      this.rules.delete(domain);
    }
  }

  check(domain) {
    if (this.rules.has(domain)) {
      return this.rules.get(domain);
    }

    for (const rule of this.wildcardRules) {
      if (rule.regex.test(domain)) {
        return rule.action;
      }
    }

    return 'allow';
  }

  getRules() {
    const allRules = [];

    for (const [domain, action] of this.rules) {
      allRules.push({ domain, action });
    }

    for (const rule of this.wildcardRules) {
      allRules.push({ domain: rule.domain, action: rule.action });
    }

    return allRules;
  }

  getBlockedDomains() {
    return this.getRules().filter(rule => rule.action === 'block').map(rule => rule.domain);
  }

  isBlocked(domain) {
    return this.check(domain) === 'block';
  }

  blockDomain(domain) {
    this.addRule(domain, 'block');
    return true;
  }

  unblockDomain(domain) {
    this.removeRule(domain);
    return true;
  }

  clearRules() {
    this.rules.clear();
    this.wildcardRules.clear();
  }
}

module.exports = DomainFilter;
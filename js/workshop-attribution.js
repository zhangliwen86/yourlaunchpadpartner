/* Workshop-only reporting hints; no storage, network or event emissions. */
(function () {
  'use strict';
  if (!/^\/(workshop|contact)(?:\/|\/index\.html)?$/.test(window.location.pathname)) return;
  // Any explicit non-zero test marker is conservative QA classification.
  // Independent of optional helper, URL route shape, or parameter ordering.
  function internalTestFromQuery(search){
    return search.replace(/^\?/, '').split('&').some(function(part){
      var split = part.indexOf('='), key = split < 0 ? part : part.slice(0, split);
      try { key = decodeURIComponent(key.replace(/\+/g, ' ')); } catch (e) { return false; }
      if (key !== 'cg_test') return false;
      var value = split < 0 ? '' : part.slice(split + 1);
      try { value = decodeURIComponent(value.replace(/\+/g, ' ')); } catch (e) { return true; }
      return value !== '0';
    });
  }
  var query = new URLSearchParams(window.location.search);
  var keys = ['utm_source','utm_medium','utm_campaign','utm_content','cg_source','cg_medium','cg_campaign','cg_content','cg_attribution_mode'];
  var ambiguous = keys.some(function(key){ return query.getAll(key).length > 1; });
  var allowed = ['profile','v25','v26','v27','v28','v29','v30','v31','v32','v33','v34','v35','v36'];
  var hasTagged = ['utm_source','utm_medium','utm_campaign','utm_content'].some(function(key){ return query.has(key); });
  var hasCarried = ['cg_source','cg_medium','cg_campaign','cg_content','cg_attribution_mode'].some(function(key){ return query.has(key); });
  var tagged = query.get('utm_source') === 'tiktok' && query.get('utm_medium') === 'organic_social' && query.get('utm_campaign') === 'cg001';
  var carried = query.get('cg_source') === 'tiktok' && query.get('cg_medium') === 'organic_social' && query.get('cg_campaign') === 'cg001' && query.get('cg_attribution_mode') === 'tagged';
  // Mixed namespaces must be complete and agree; conflicting/partial hints are unknown.
  if (hasTagged && hasCarried && (!tagged || !carried || query.get('utm_content') !== query.get('cg_content'))) ambiguous = true;
  var accepted = !ambiguous && (tagged || carried);
  var content = tagged ? query.get('utm_content') : query.get('cg_content');
  var context = {
    cg_source: accepted ? 'tiktok' : 'unknown',
    cg_medium: accepted ? 'organic_social' : 'unknown',
    cg_campaign: accepted ? 'cg001' : 'unknown',
    cg_content: accepted && allowed.indexOf(content) !== -1 ? content : 'unknown',
    cg_attribution_mode: accepted ? 'tagged' : 'unknown',
    cg_test: internalTestFromQuery(window.location.search) ? '1' : '0'
  };
  window.YLPP_WORKSHOP_ATTRIBUTION = { fields: function(){ return Object.assign({},context); } };
  if (/^\/workshop(?:\/|\/index\.html)?$/.test(window.location.pathname)) {
    document.querySelectorAll('a[href]').forEach(function(link){
      var destination;
      try { destination = new URL(link.getAttribute('href'),window.location.href); } catch(e){ return; }
      if(destination.origin !== window.location.origin || !/^\/contact(?:\/|\/index\.html)?$/.test(destination.pathname) || destination.searchParams.getAll('interest').length !== 1 || destination.searchParams.get('interest') !== 'workshop') return;
      keys.concat(['cg_test']).forEach(function(key){ destination.searchParams.delete(key); });
      if(accepted) Object.keys(context).forEach(function(key){ destination.searchParams.set(key,context[key]); });
      else if(context.cg_test === '1') destination.searchParams.set('cg_test','1');
      link.setAttribute('href',destination.pathname+destination.search+destination.hash);
    });
  }
})();

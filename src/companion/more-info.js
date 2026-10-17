// Callers supply already escaped/localized explanatory markup.
export function moreInfo(content){
  return `<details class="cp-more-info"><summary>+ Info</summary><div class="cp-more-info-content">${content}</div></details>`;
}

export function replaceHelpMarkup(element,markup){
  const previous=[...element.querySelectorAll('details.cp-more-info')],open=previous.map(details=>details.open);
  const focused=previous.findIndex(details=>details.querySelector('summary')===document.activeElement);
  const template=document.createElement('template');template.innerHTML=markup;
  const next=template.content.firstElementChild;
  [...next.querySelectorAll('details.cp-more-info')].forEach((details,index)=>{details.open=!!open[index];});
  element.replaceWith(next);
  if(focused>=0)next.querySelectorAll('details.cp-more-info > summary')[focused]?.focus({preventScroll:true});
}

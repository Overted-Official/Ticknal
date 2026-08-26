export function getBankShortName(fullName?: string | null): string {
  if (!fullName) return 'Bank';
  const name = fullName.trim();
  const lower = name.toLowerCase();

  if (lower.includes('commercial international bank') || lower.includes('cib')) return 'CIB';
  if (lower.includes('national bank of egypt') || lower.includes('al ahly') || lower.includes('nbe')) return 'NBE';
  if (lower.includes('banque misr') || lower.includes('mist')) return 'Banque Misr';
  if (lower.includes('banque du caire') || lower.includes('du caire')) return 'Banque du Caire';
  if (lower.includes('hsbc')) return 'HSBC';
  if (lower.includes('qnb') || lower.includes('qatar national')) return 'QNB';
  if (lower.includes('alex') || lower.includes('alexandria')) return 'AlexBank';
  if (lower.includes('arab african') || lower.includes('aaib')) return 'AAIB';
  if (lower.includes('adib') || lower.includes('abu dhabi islamic')) return 'ADIB';
  if (lower.includes('faisal')) return 'Faisal Bank';
  if (lower.includes('credit agricole') || lower.includes('crédit agricole')) return 'Crédit Agricole';
  if (lower.includes('emirates nbd')) return 'Emirates NBD';
  if (lower.includes('eg bank') || lower.includes('egyptian gulf')) return 'EG Bank';
  if (lower.includes('baraka')) return 'Al Baraka';
  if (lower.includes('attijariwafa')) return 'Attijariwafa';
  if (lower.includes('suez canal')) return 'Suez Canal Bank';
  if (lower.includes('ahli united') || lower.includes('aub')) return 'AUB';
  if (lower.includes('saib')) return 'saib';
  if (lower.includes('ebank') || lower.includes('export development')) return 'EBank';
  if (lower.includes('adcb') || lower.includes('abu dhabi commercial')) return 'ADCB';
  if (lower.includes('arab bank')) return 'Arab Bank';
  if (lower.includes('thndr')) return 'Thndr';
  if (lower.includes('instapay')) return 'InstaPay';
  if (lower.includes('vodafone')) return 'Vodafone Cash';

  return name;
}

export function formatCleanAccountTitle(account: {
  accountName: string;
  bankName?: string | null;
  customBankName?: string | null;
  accountType?: string | null;
  currency?: string | null;
}): { bankShort: string; subName: string } {
  const bankRaw = account.bankName || account.customBankName || account.accountName;
  const bankShort = getBankShortName(bankRaw);

  let sub = account.accountName || '';
  sub = sub
    .replace(/Commercial International Bank/gi, '')
    .replace(/Banque Misr/gi, '')
    .replace(/Banque Mist/gi, '')
    .replace(/HSBC Bank Egypt/gi, '')
    .replace(/HSBC Bank/gi, '')
    .replace(/National Bank of Egypt/gi, '')
    .replace(/CIB/gi, '')
    .replace(/HSBC/gi, '')
    .replace(/Banque/gi, '')
    .replace(/\(EGP\)/gi, '')
    .replace(/\(USD\)/gi, '')
    .replace(/EGP/gi, '')
    .replace(/USD/gi, '')
    .trim();

  // Strip leading/trailing punctuation or extra dashes
  sub = sub.replace(/^[-–—·•() ]+|[-–—·•() ]+$/g, '').trim();

  if (!sub) {
    sub = account.accountType ? account.accountType.replace(/_/g, ' ') : 'Main Account';
  }

  return { bankShort, subName: sub };
}

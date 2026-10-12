// Hindi and Bengali sample text for checking layout in Devanagari and Bangla before the real
// translations exist (105–107). None of this is a translation, and none of it ships: the headings
// are plain sentences written to read naturally, and every other piece of text on a screen is
// filled with real words of that script, a little longer than the English, so a screen is set
// entirely in the script the way a translated one will be. The words carry marks above and below
// the line (ि ँ ृ ु, ি ঁ ৃ ু) and conjuncts (क्ष, স্ম) on purpose.

export const samples = {
  hi: {
    lang: 'hi',
    welcomeTitle: 'जो मायने रखता है, उसे साथ संजोएँ।',
    eyebrow: 'दो लोगों की साझा यात्रा',
    journey: 'हमारी पहली यात्रा',
    momentTitle: 'एक शांत शाम',
    momentDetail: 'हम देर तक छत पर बैठे रहे और पुरानी स्मृतियों की बातें करते रहे।',
    settingsTitle: 'यात्रा की सेटिंग्स',
    dialogTitle: 'नए सिरे से शुरू करें?',
    dialogConsequence: 'इस ब्राउज़र में रखे सभी पल मिट जाएँगे। यह वापस नहीं होगा।',
    words: ['यात्रा', 'पल', 'साथ', 'हम', 'दोनों', 'याद', 'घर', 'समय', 'बात', 'आज', 'प्रेम', 'स्मृतियाँ', 'क्षण', 'ध्यान', 'रखें', 'देखें', 'लिखें', 'सुरक्षित', 'निजी', 'साझा', 'व्यक्ति', 'जगह', 'शुरू', 'करें', 'और', 'में', 'से', 'एक', 'नया', 'कृपया', 'प्रविष्टि', 'सहेजें', 'द्वार', 'स्थान', 'ट्रैक', 'श्रेणी', 'हूँ', 'कृतज्ञ'],
  },
  bn: {
    lang: 'bn',
    welcomeTitle: 'যা গুরুত্বপূর্ণ, তা একসাথে রাখুন।',
    eyebrow: 'দুজনের এক যৌথ যাত্রা',
    journey: 'আমাদের প্রথম যাত্রা',
    momentTitle: 'এক শান্ত সন্ধ্যা',
    momentDetail: 'আমরা অনেকক্ষণ ছাদে বসে পুরোনো স্মৃতির কথা বললাম।',
    settingsTitle: 'যাত্রার সেটিংস',
    dialogTitle: 'নতুন করে শুরু করবেন?',
    dialogConsequence: 'এই ব্রাউজারে রাখা সব মুহূর্ত মুছে যাবে। এটি ফেরানো যাবে না।',
    words: ['যাত্রা', 'মুহূর্ত', 'একসাথে', 'আমরা', 'দুজন', 'স্মৃতি', 'বাড়ি', 'সময়', 'কথা', 'আজ', 'ভালোবাসা', 'ক্ষণ', 'মনোযোগ', 'রাখুন', 'দেখুন', 'লিখুন', 'সুরক্ষিত', 'ব্যক্তিগত', 'যৌথ', 'ব্যক্তি', 'জায়গা', 'শুরু', 'করুন', 'এবং', 'থেকে', 'এক', 'নতুন', 'পুরোনো', 'অনুগ্রহ', 'সংরক্ষণ', 'দরজা', 'স্থান', 'শ্রেণি', 'চাঁদ', 'কৃতজ্ঞ'],
  },
};

/**
 * Runs in the page: sets <html lang>, puts the hand-written sentences where `places` says, and fills
 * every other piece of visible text with the script's words. The brand stays Latin, as it will.
 * `places` maps a CSS selector to a key of the sample.
 */
export function setInScript(sample, places) {
  document.documentElement.lang = sample.lang;
  const placed = new Set();
  for (const [selector, key] of Object.entries(places)) {
    for (const element of document.querySelectorAll(selector)) {
      element.textContent = sample[key];
      placed.add(element);
    }
  }
  const skip = (node) => {
    for (let element = node.parentElement; element; element = element.parentElement) {
      if (placed.has(element) || ['SCRIPT', 'STYLE', 'svg', 'TEXTAREA', 'OPTION'].includes(element.tagName)) return true;
      if (element.matches('.brand, .dialog-signature')) return true;
    }
    return false;
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (/[A-Za-z]{2}/.test(walker.currentNode.nodeValue) && !skip(walker.currentNode)) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const text = node.nodeValue;
    const target = Math.ceil(text.trim().length * 1.15);
    let seed = [...text].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 7);
    const out = [];
    while (out.join(' ').length < target) {
      out.push(sample.words[seed % sample.words.length]);
      seed = (seed * 1103515245 + 12345) >>> 0;
    }
    const lead = text.match(/^\s*/)[0];
    const tail = text.match(/\s*$/)[0];
    node.nodeValue = `${lead}${out.join(' ')}${tail}`;
  }
  for (const element of document.querySelectorAll('[placeholder]')) element.placeholder = sample.words.slice(0, 3).join(' ');
}

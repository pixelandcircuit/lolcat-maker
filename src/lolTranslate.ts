const dictionary: Record<string, string | string[]> = {
  'i can have': 'i can has',
  'oh really': 'orly',
  'seriously': 'srsly',
  'uestion': 'wesjun',

  'unless': 'unles',
  'really': ['rly', 'rily', 'rilly', 'rilley'],
  "you're": ['yore', 'yr'],
  'buddah': 'ceiling cat',
  'kitten': 'kitteh',

  'cture': 'kshur',
  'esque': 'esk',
  'tious': 'shus',
  'thank': ['fank', 'tank', 'thx', 'thnx'],
  'world': ['wurrld', 'whirld', 'wurld', 'wrld'],
  'hello': 'oh hai',
  'howdy': 'oh hai',
  'allah': 'ceiling cat',
  'diety': 'ceiling cat',
  'kitty': 'kitteh',

  'this': 'thiz',
  'eady': 'eddy',
  'what': ['wut', 'whut'],
  'more': 'moar',
  'sion': 'shun',
  'just': 'jus',
  'want': 'waants',
  'eese': 'eez',
  'ucke': ['ukki', 'ukke'],
  'like': ['likes', 'liek'],
  'love': ['loves', 'lub', 'lubs', 'luv'],
  'outh': 'owf',
  'scio': 'shu',
  'ture': 'chur',
  'sure': 'shur',
  'were': 'was',
  'ease': 'eez',
  'have': ['has', 'hav', 'haz a'],
  'your': ['yur', 'ur', 'yore', 'yoar'],
  'good': ['gud', 'goed', 'guud', 'gude', 'gewd'],
  'ight': 'ite',
  'tion': 'shun',

  'ome': 'um',
  'are': ['r', 'is', 'ar'],
  'you': ['yu', 'yous', 'yoo', 'u'],
  'the': 'teh',
  'ose': 'oze',
  'ead': 'edd',
  'eak': 'ekk',
  'age': 'uj',
  'dog': 'slowpaw',
  'who': 'hoo',
  'ese': 'eez',
  'too': ['to', '2'],
  'tty': 'tteh',
  'thy': 'fee',
  'que': 'kwe',
  'oth': 'udd',
  'ing': ['in', 'ins', 'ng', 'ing'],
  'ove': ['oov', 'ove', 'uuv', 'uv', 'oove'],
  'for': ['fore', '4', 'fr', 'fur', 'for', 'foar'],
  "i'm": 'im',
  'hey': 'oh hai',
  'god': 'ceiling cat',
  'cat': 'kitteh',

  'ph': 'f',
  'as': 'az',
  'my': ['muh', 'mah'],
  'er': 'r',
  'of': ['of', 'ov', 'of'],
  'is': ['ar teh', 'ar'],
  'nd': 'n',
  'ok': ['k', 'kay'],
  'ym': 'im',
  'ly': 'li',
};

const pattern = new RegExp(
  Object.keys(dictionary)
    .map((k) => `(${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`)
    .join('|'),
  'gm',
);

export function lolTranslate(text: string): string {
  return text.toLowerCase().replace(pattern, (match) => {
    const replacement = dictionary[match];
    if (Array.isArray(replacement)) {
      return replacement[Math.floor(Math.random() * replacement.length)];
    }
    return replacement ?? match;
  });
}

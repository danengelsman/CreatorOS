import * as fs from 'fs';
import * as path from 'path';

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        arrayOfFiles.push(path.join(process.cwd(), dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles('src/components');

const mapping: Record<string, string> = {
  Home: 'House',
  Plus: 'Plus',
  Target: 'Target',
  Triangle: 'Triangle',
  User: 'UserCircle',
  UserCircle: 'UserCircle',
  Settings: 'GearSix',
  Search: 'MagnifyingGlass',
  Sparkles: 'Sparkle',
  Download: 'DownloadSimple',
  LogOut: 'SignOut',
  ChevronRight: 'CaretRight',
  ChevronLeft: 'CaretLeft',
  ChevronDown: 'CaretDown',
  ChevronUp: 'CaretUp',
  Save: 'FloppyDisk',
  BookOpen: 'BookOpen',
  Compass: 'Compass',
  Brain: 'Brain',
  Activity: 'Pulse',
  TrendingUp: 'TrendUp',
  RefreshCw: 'ArrowsClockwise',
  ExternalLink: 'ArrowSquareOut',
  Lock: 'LockKey', // Lock => LockKey or Lock
  Check: 'Check',
  X: 'X',
  XCircle: 'XCircle',
  AlignLeft: 'List',
  Menu: 'List',
  Type: 'TextT',
  Image: 'Image',
  ImageIcon: 'Image',
  Hash: 'Hash',
  Mic: 'Microphone',
  Palette: 'Palette',
  ShieldCheck: 'ShieldCheck',
  DollarSign: 'CurrencyDollar',
  Trophy: 'Trophy',
  Loader2: 'CircleNotch',
  Users2: 'UsersThree',
  PieChart: 'ChartPie',
  Mail: 'Envelope',
  MessageCircle: 'ChatsCircle',
  Zap: 'Lightning',
  Trash2: 'Trash',
  RefreshCcw: 'ArrowsClockwise',
  Camera: 'Camera',
  Eye: 'Eye',
  FileText: 'FileText',
  Play: 'Play',
  Pause: 'Pause',
  SkipBack: 'SkipBack',
  SkipForward: 'SkipForward',
  Lightbulb: 'Lightbulb',
  ArrowRight: 'ArrowRight',
  ArrowLeft: 'ArrowLeft',
  Globe: 'Globe',
  Send: 'PaperPlaneRight',
  CheckCircle2: 'CheckCircle',
  Sparkle: 'Sparkle'
};

const processedIcons = new Set<string>();
const allIcons = new Set<string>();

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Find all lucide-react imports
  const matches = content.match(/import\s+{([^}]+)}\s+from\s+'lucide-react'/g);
  if (matches) {
    matches.forEach(match => {
      const matchInner = match.match(/import\s+{([^}]+)}\s+from\s+'lucide-react'/)![1];
      const icons = matchInner.split(',').map(i => i.trim()).filter(i => i);
      icons.forEach(i => allIcons.add(i));
      
      const newIcons = icons.map(icon => {
        const mapped = mapping[icon] || icon;
        processedIcons.add(mapped);
        return mapped === icon ? icon : `${mapped} as ${icon}`;
      });
      content = content.replace(match, `import { ${newIcons.join(', ')} } from '@phosphor-icons/react'`);
    });
    
    // Add default styling for phosphor icons? Wait, the user asked for:
    // Apply this default styling pattern in every icon usage:
    // <House size={20} weight="duotone" />
    
    // So we can replace <IconName ... /> with <IconName weight="duotone" ... /> for all icons we mapped.
    // Or we can just let another step handle styling, but let's do it here.
    // We can do a string replacement for `<IconName ` to `<IconName weight="duotone" `
    // Wait, replacing all components that are an icon with weight="duotone".
    
    // Instead of replacing every `<Icon `, let's map what we imported.
    const importedAliases = [];
    matches.forEach(match => {
      const matchInner = match.match(/import\s+{([^}]+)}\s+from\s+'lucide-react'/)![1];
      const iconsInMatch = matchInner.split(',').map(i => i.trim()).filter(i => i);
      // for each icon, if used as component, it's <IconName 
      importedAliases.push(...iconsInMatch);
    });
    
    importedAliases.forEach(alias => {
       // Replace <Alias to <Alias weight="duotone" if not already having weight
       // and what if it's an end tag? <Alias/> -> <Alias weight="duotone" />
       // Regex: /<Alias(\s|>|\/)/g
       // Be careful with props.
       const regex = new RegExp(`<(${alias})(?:\\\\s+([^>]*))?>`, 'g');
       content = content.replace(regex, (m, comp, propsStr) => {
         // check if weight is already there
         if (propsStr && propsStr.includes('weight=')) {
           return m;
         }
         // check if it's self closing or opening
         if (propsStr) {
           return `<${comp} weight="duotone" ${propsStr}>`;
         } else {
           return `<${comp} weight="duotone" >`;
         }
       });
    });

    fs.writeFileSync(file, content);
  }
});
console.log('All icons found:', Array.from(allIcons).sort().join(', '));
console.log('File replacements completed.');

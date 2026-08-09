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

const comprehensiveMapping: Record<string, string> = {
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
  Lock: 'LockKey',
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
  Sparkle: 'Sparkle',
  PenTool: 'PenNib',
  BarChart3: 'ChartBar',
  MoreHorizontal: 'DotsThree',
  MoreVertical: 'DotsThreeVertical',
  VideoIcon: 'VideoCamera',
  Video: 'VideoCamera',
  Calendar: 'Calendar',
  CalendarIcon: 'Calendar',
  MessageCircleMore: 'Chats',
  MessageSquare: 'Chat',
  Music2: 'MusicNotes',
  AlertCircle: 'WarningCircle',
  ArrowUpRight: 'ArrowUpRight',
  Award: 'Medal',
  Clock: 'Clock',
  Copy: 'Copy',
  Filter: 'Funnel',
  Flag: 'Flag',
  HelpCircle: 'Question',
  Layers: 'Stack',
  Layout: 'Layout',
  LayoutGrid: 'GridFour',
  LineChart: 'ChartLine',
  Map: 'MapTrifold',
  Share2: 'ShareNetwork',
  Shield: 'Shield',
  Star: 'Star',
  Upload: 'UploadSimple',
  Users: 'Users',
  Volume2: 'SpeakerHigh',
  Youtube: 'YoutubeLogo',
  Twitter: 'TwitterLogo',
  Instagram: 'InstagramLogo',
};

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Revert back and fix
  // Wait, if we already converted `lucide-react` to `@phosphor-icons/react` we need to look for `@phosphor-icons/react` and fix its contents
  const matches = content.match(/import\s+{([^}]+)}\s+from\s+'@phosphor-icons\/react'/g);
  if (matches) {
    matches.forEach(match => {
      const matchInner = match.match(/import\s+{([^}]+)}\s+from\s+'@phosphor-icons\/react'/)![1];
      const icons = matchInner.split(',').map(i => i.trim()).filter(i => i);
      
      const newIcons = icons.map(iconStr => {
        // e.g. "Calendar as CalendarIcon" or "PenTool"
        // But what if it's already translated "SignOut as LogOut" ?
        const parts = iconStr.split(/\s+as\s+/);
        let origName = parts[0];
        let alias = parts[parts.length - 1]; // if "Apples as Oranges" Orig=Apples, alias=Oranges
        
        // Wait, for BarChart3, we didn't translate it earlier because it wasn't in the mapping!
        // So origName might be BarChart3.
        // Let's translate origName using comprehensiveMapping
        let newOrigName = comprehensiveMapping[origName] || origName;
        // If it was "BarChart3 as BarChart3Context", newOrigName is "ChartBar"
        
        if (newOrigName === alias) {
          return newOrigName;
        } else {
          return `${newOrigName} as ${alias}`;
        }
      });
      content = content.replace(match, `import { ${newIcons.join(', ')} } from '@phosphor-icons/react'`);
    });
    fs.writeFileSync(file, content);
  }
});
console.log('Phosphor imports patched!');

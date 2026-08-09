const fs = require('fs');
let content = fs.readFileSync('src/components/VideoStudio.tsx', 'utf8');

content = content.replace("useState('Female')", "useState(brand?.avatar?.gender || 'Female')");
content = content.replace("useState('Professional business attire')", "useState(brand?.avatar?.clothing || 'Professional business attire')");
content = content.replace("useState('Modern office with soft lighting')", "useState(brand?.avatar?.background || 'Modern office with soft lighting')");

fs.writeFileSync('src/components/VideoStudio.tsx', content);

import {randomBytes,createHash,scryptSync,timingSafeEqual} from 'node:crypto';
export const id=()=>randomBytes(16).toString('hex');
export const token=()=>randomBytes(32).toString('hex');
export const hash=v=>createHash('sha256').update(v).digest('hex');
export function passwordHash(password){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex')}
export function passwordValid(password,stored){try{const [salt,key]=stored.split(':');const actual=scryptSync(password,salt,64),expected=Buffer.from(key,'hex');return expected.length===actual.length&&timingSafeEqual(actual,expected)}catch{return false}}
export function validPassword(p){return typeof p==='string'&&p.length>=12&&p.length<=128}
export const publicUser=u=>({id:u.id,name:u.name,email:u.email,role:u.role,verified:!!u.verified,mustChange:!!u.must_change});
export function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(p=>p.trim().split('=')).filter(p=>p.length===2))}
export function email(v){return typeof v==='string'&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
export function text(v,max=2000){return typeof v==='string'&&v.trim().length>0&&v.trim().length<=max}
export function rateLimit(db,key,limit,window=60000){const now=Date.now();db.prepare('INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END').run(key,now+window,now,now);return db.prepare('SELECT count FROM rate_limits WHERE key=?').get(key).count<=limit}

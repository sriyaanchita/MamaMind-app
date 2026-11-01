import React, { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, Modal, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { arrayUnion, doc, getDoc, onSnapshot, runTransaction, serverTimestamp, setDoc, type DocumentReference } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { getMyFamily } from '@/utils/familyService';

const C = { yellow:'#FFDA57', teal:'#19B7B0', deepTeal:'#0E7C86', white:'#FFFFFF', coral:'#FF6B6B', cream:'#FFF9E8', paleTeal:'#E8F8F6', dark:'#164F52', muted:'#648384' };
const AI_API_URL = process.env.EXPO_PUBLIC_AI_API_URL ? `${process.env.EXPO_PUBLIC_AI_API_URL.replace(/\/$/, '')}/api/chat` : '';
type Note = { id:number; message:string; createdAt:string; read:boolean };
type Offer = { id:number; message:string; createdAt:string; status:'pending'|'accepted'|'later' };
type Task = { id:string; title:string; assignedTo:string; completed:boolean };
const suggestions = [
  {title:'Give Mama a quiet break',description:'Take care of baby while Mama rests or enjoys a shower.',icon:'cafe-outline' as const},
  {title:'Take one household task',description:'Handle bottles, laundry or a meal without waiting to be asked.',icon:'home-outline' as const},
  {title:'Spend time with baby',description:'Try a gentle story, a song or a calm cuddle.',icon:'happy-outline' as const},
  {title:'Listen and check in',description:'Ask what would make today easier, without pressure.',icon:'heart-outline' as const},
];
const todayKey = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export default function FatherDashboard() {
  const router=useRouter();
  const [sharedRef,setSharedRef]=useState<DocumentReference|null>(null);
  const [familyError,setFamilyError]=useState('');
  const [notes,setNotes]=useState<Note[]>([]);
  const [offers,setOffers]=useState<Offer[]>([]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [supportDates,setSupportDates]=useState<string[]>([]);
  const [noteText,setNoteText]=useState('');
  const [offerText,setOfferText]=useState('I can take care of baby for a while. Would you like some time to rest?');
  const [noteVisible,setNoteVisible]=useState(false);
  const [offerVisible,setOfferVisible]=useState(false);
  const [coachVisible,setCoachVisible]=useState(false);
  const [coachQuestion,setCoachQuestion]=useState('');
  const [coachReply,setCoachReply]=useState('Ask me how to support Mama or care for baby today.');
  const [busy,setBusy]=useState(false);
  const [coachBusy,setCoachBusy]=useState(false);
  const [ideaIndex,setIdeaIndex]=useState(0);
  useEffect(()=>{
    let live=true; let offShared:(()=>void)|undefined; let offTasks:(()=>void)|undefined;
    (async()=>{try{
      const family=await getMyFamily();
      if(!family?.familyId){if(live)setFamilyError('Connect with Mama to share notes and offers.');return;}
      const ref=doc(db,'families',family.familyId,'sharedData','current');
      const existing=await getDoc(ref);
      if(!existing.exists()) await setDoc(ref,{encouragements:[],supportOffers:[],supportDates:[],updatedAt:serverTimestamp()});
      if(!live)return;
      setSharedRef(ref);
      offShared=onSnapshot(ref,s=>{
        const d=s.data()||{};
        setNotes(Array.isArray(d.encouragements)?d.encouragements.filter((n:any)=>typeof n?.message==='string'):[]);
        setOffers(Array.isArray(d.supportOffers)?d.supportOffers.filter((o:any)=>typeof o?.message==='string'):[]);
        setSupportDates(Array.isArray(d.supportDates)?d.supportDates:[]);
      },e=>setFamilyError('Could not sync family data: '+e.message));
      const {collection}=await import('firebase/firestore');
      offTasks=onSnapshot(collection(db,'families',family.familyId,'sharedTasks'),s=>setTasks(s.docs.map(x=>({id:x.id,title:String(x.data().title||''),assignedTo:String(x.data().assignedTo||''),completed:!!x.data().completed}))),e=>console.warn('Shared tasks:',e));
    }catch(e:any){if(live)setFamilyError(e?.message||'Could not connect to family.');}})();
    return ()=>{live=false;offShared?.();offTasks?.();};
  },[]);
  const saveItem=async(field:'encouragements'|'supportOffers',message:string)=>{
    if(!sharedRef){Alert.alert('Family not connected','Connect Mama and Dad first.');return false;}
    if(!message.trim()){Alert.alert('Write a message','Please type a message first.');return false;}
    if(message.trim().length>500){Alert.alert('Too long','Keep your message under 500 characters.');return false;}
    setBusy(true);
    try{
      await runTransaction(db,async tx=>{
        const snap=await tx.get(sharedRef);
        const previous=Array.isArray(snap.data()?.[field])?snap.data()![field]:[];
        const item=field==='encouragements'
          ? {id:Date.now(),message:message.trim(),createdAt:new Date().toISOString(),read:false}
          : {id:Date.now(),message:message.trim(),createdAt:new Date().toISOString(),status:'pending'};
        tx.set(sharedRef,{[field]:[item,...previous].slice(0,40),updatedAt:serverTimestamp()},{merge:true});
      });
      return true;
    }catch(e){console.error(e);Alert.alert('Not sent','Please check your internet connection and Firestore rules.');return false;}
    finally{setBusy(false);}
  };
  const sendNote=async()=>{if(await saveItem('encouragements',noteText)){setNoteVisible(false);setNoteText('');Alert.alert('Sent ♡','Mama can now see your Little Note.');}};
  const sendOffer=async()=>{if(await saveItem('supportOffers',offerText)){setOfferVisible(false);Alert.alert('Offer sent','Mama can respond from her dashboard.');}};
  const markSupport=async()=>{if(!sharedRef)return Alert.alert('Connect family first');try{const {updateDoc}=await import('firebase/firestore');await updateDoc(sharedRef,{supportDates:arrayUnion(todayKey()),updatedAt:serverTimestamp()});setIdeaIndex(i=>(i+1)%suggestions.length);}catch(e){Alert.alert('Could not save','Please try again.');}};
  const askCoach=async()=>{if(!coachQuestion.trim())return; if(!AI_API_URL){setCoachReply('Set EXPO_PUBLIC_AI_API_URL to your deployed backend HTTPS address, then restart Expo.');return;}setCoachBusy(true);try{const r=await fetch(AI_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:coachQuestion.trim()})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');setCoachReply(String(d.reply||d.response||d.message||'No response received.'));}catch(e){setCoachReply('Could not reach Dad Coach. Check the backend URL and connection.');}finally{setCoachBusy(false);}};
  const Card=({icon,title,subtitle,onPress,tint=C.paleTeal}:{icon:React.ComponentProps<typeof Ionicons>['name'];title:string;subtitle:string;onPress:()=>void;tint?:string})=>(
    <Pressable onPress={onPress} style={({pressed})=>[styles.tile,pressed&&{opacity:.75}]}><View style={[styles.iconCircle,{backgroundColor:tint}]}><Ionicons name={icon} size={23} color={C.deepTeal}/></View><Text style={styles.tileTitle}>{title}</Text><Text style={styles.tileSub}>{subtitle}</Text><Ionicons name="arrow-forward" size={16} color={C.deepTeal} style={{alignSelf:'flex-end'}}/></Pressable>
  );
  const unread=notes.filter(n=>!n.read).length;
  const pending=tasks.filter(t=>!t.completed).length;
  return <SafeAreaView style={styles.safe}><StatusBar barStyle="dark-content" backgroundColor={C.cream}/><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <View style={styles.header}><View style={{flex:1}}><Text style={styles.eyebrow}>YOUR MAMAMIND SPACE</Text><Text style={styles.heading}>Together, every{'\n'}<Text style={{color:C.teal}}>little day.</Text></Text><Text style={styles.subtitle}>Show up for Mama. Share baby care.{'\n'}Make room for each other.</Text></View><View style={styles.headerHeart}><Ionicons name="heart-outline" size={27} color={C.deepTeal}/></View></View>
    {familyError?<Pressable onPress={()=>router.push('/connect-family')} style={styles.warning}><Text style={{color:C.dark}}>{familyError}  Connect family →</Text></Pressable>:null}
    <View style={styles.hero}><Text style={styles.heroLabel}>TODAY'S FAMILY CARE</Text><Text style={styles.heroTitle}>How can you help today?</Text><Text style={styles.heroSub}>A little care can make a big difference.</Text><View style={styles.heroActions}><Pressable style={styles.yellowBtn} onPress={()=>setOfferVisible(true)}><Text style={styles.darkBtnText}>Offer help  →</Text></Pressable><Pressable style={styles.whiteBtn} onPress={()=>setNoteVisible(true)}><Text style={styles.darkBtnText}>Send love  ♡</Text></Pressable></View></View>
    <Text style={styles.section}>Care for Mama</Text><View style={styles.grid}>
      <Card icon="chatbubble-ellipses-outline" title="Check on Mama" subtitle={offers[0]?.status==='pending'?'Awaiting her reply':offers[0]?.status==='accepted'?'Mama accepted your offer':offers[0]?.status==='later'?'Mama said maybe later':'Ask how you can help'} onPress={()=>setOfferVisible(true)}/>
      <Card icon="mail-outline" title="Little Notes" subtitle={notes.length?`${notes.length} sent · ${unread} unread`:'Write your own message'} onPress={()=>setNoteVisible(true)} tint={C.cream}/>
      <Card icon="checkbox-outline" title="Shared Tasks" subtitle={`${pending} pending tasks`} onPress={()=>router.push('/shared-tasks')}/>
      <Card icon="happy-outline" title="Baby Space" subtitle="Care, feeding & milestones" onPress={()=>router.push('/baby-dashboard')} tint={C.cream}/>
    </View>
    <Text style={styles.section}>Dad's Care Toolkit</Text><View style={styles.grid}>
      <Card icon="cube-outline" title="Care Supplies" subtitle="Stock and shopping list" onPress={()=>router.push('/care-supplies')} tint={C.cream}/>
      <Card icon="moon-outline" title="Rest Guardian" subtitle="Protect Mama's rest" onPress={()=>router.push('/rest-guardian')} tint={C.paleTeal}/>
      <Card icon="clipboard-outline" title="Invisible Load" subtitle="Own recurring responsibilities" onPress={()=>router.push('/invisible-load')} tint={C.cream}/>
      <Card icon="heart-circle-outline" title="Comfort Decoder" subtitle="Learn what soothes baby" onPress={()=>router.push('/baby-comfort')} tint={C.paleTeal}/>
    </View>
    <Text style={styles.section}>One helpful thing</Text><View style={styles.suggestion}><View style={styles.suggestionTop}><View style={styles.iconCircle}><Ionicons name={suggestions[ideaIndex].icon} size={23} color={C.deepTeal}/></View><Text style={[styles.eyebrow,{flex:1}]}>TODAY'S SUPPORT IDEA</Text></View><Text style={styles.suggestionTitle}>{suggestions[ideaIndex].title}</Text><Text style={styles.suggestionText}>{suggestions[ideaIndex].description}</Text><Pressable onPress={markSupport} style={styles.tealBtn}><Text style={styles.lightBtnText}>I did this  ✓</Text></Pressable></View>
    <Text style={styles.section}>Your family moments</Text><View style={styles.statRow}><View style={styles.stat}><Text style={styles.statNum}>{supportDates.length}</Text><Text style={styles.statLabel}>Days you showed up</Text></View><View style={styles.stat}><Text style={styles.statNum}>{tasks.filter(t=>t.completed).length}</Text><Text style={styles.statLabel}>Tasks completed</Text></View></View>
    <Pressable onPress={()=>router.push('/connect-family')} style={styles.connect}><Ionicons name="people-outline" size={19} color={C.deepTeal}/><Text style={styles.connectText}>Family connection settings  →</Text></Pressable><Text style={styles.footer}>MamaMind • Together, one little step at a time. ♡</Text>
  </ScrollView>
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Open Dad Coach"
    onPress={() => setCoachVisible(true)}
    style={({ pressed }) => [styles.floatingCoach, pressed && styles.floatingCoachPressed]}
  >
    <Ionicons name="sparkles-outline" size={20} color={C.white} />
    <Text style={styles.floatingCoachText}>Dad Coach</Text>
  </Pressable>
  <Modal visible={noteVisible} transparent animationType="slide" onRequestClose={()=>setNoteVisible(false)}><View style={styles.overlay}><View style={styles.modal}><Text style={styles.modalTitle}>A Little Note for Mama ♡</Text><Text style={styles.modalSub}>Write something personal. She'll see it in her MamaMind space.</Text><TextInput value={noteText} onChangeText={setNoteText} multiline maxLength={500} placeholder="I appreciate you because…" placeholderTextColor={C.muted} style={styles.input}/><Text style={styles.counter}>{noteText.length}/500</Text><Pressable disabled={busy} onPress={sendNote} style={styles.tealBtn}><Text style={styles.lightBtnText}>{busy?'Sending…':'Send Little Note  ♡'}</Text></Pressable><Pressable onPress={()=>setNoteVisible(false)} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable></View></View></Modal>
  <Modal visible={offerVisible} transparent animationType="slide" onRequestClose={()=>setOfferVisible(false)}><View style={styles.overlay}><View style={styles.modal}><Text style={styles.modalTitle}>Check on Mama ♡</Text><Text style={styles.modalSub}>Offer practical help. Mama can choose to accept or respond later.</Text><View style={styles.chips}>{['I can take care of baby for a while. Would you like some time to rest?','I can handle dinner today. Would that help?','Would you like me to listen or take something off your list?'].map((s,i)=><Pressable key={i} onPress={()=>setOfferText(s)} style={styles.chip}><Text style={styles.chipText}>{s}</Text></Pressable>)}</View><TextInput value={offerText} onChangeText={setOfferText} multiline maxLength={500} style={styles.input}/><Pressable disabled={busy} onPress={sendOffer} style={styles.tealBtn}><Text style={styles.lightBtnText}>{busy?'Sending…':'Send support offer  →'}</Text></Pressable><Pressable onPress={()=>setOfferVisible(false)} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable></View></View></Modal>
  <Modal visible={coachVisible} transparent animationType="slide" onRequestClose={()=>setCoachVisible(false)}><View style={styles.overlay}><View style={styles.modal}><Text style={styles.modalTitle}>Dad Coach ✦</Text><ScrollView style={{maxHeight:180,marginVertical:12}}><Text style={styles.suggestionText}>{coachReply}</Text></ScrollView><TextInput value={coachQuestion} onChangeText={setCoachQuestion} placeholder="Mama seems tired. What can I do?" placeholderTextColor={C.muted} multiline style={styles.input}/><Pressable disabled={coachBusy} onPress={askCoach} style={styles.tealBtn}>{coachBusy?<ActivityIndicator color={C.white}/>:<Text style={styles.lightBtnText}>Get guidance  →</Text>}</Pressable><Pressable onPress={()=>setCoachVisible(false)} style={styles.cancel}><Text style={styles.cancelText}>Close</Text></Pressable><Text style={styles.modalSub}>Supportive guidance only, not medical advice.</Text></View></View></Modal>
  </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:C.cream},content:{paddingHorizontal:18,paddingTop:14,paddingBottom:36},header:{flexDirection:'row',alignItems:'flex-start',marginBottom:19},eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.4,color:C.deepTeal,marginBottom:8},heading:{fontSize:29,lineHeight:35,fontWeight:'900',color:C.dark},subtitle:{fontSize:12,lineHeight:19,color:C.muted,marginTop:8},headerHeart:{width:48,height:48,borderRadius:24,backgroundColor:C.yellow,alignItems:'center',justifyContent:'center'},warning:{backgroundColor:C.yellow,padding:12,borderRadius:12,marginBottom:12},hero:{backgroundColor:C.deepTeal,borderRadius:24,padding:19,marginBottom:22},heroLabel:{fontSize:10,fontWeight:'900',letterSpacing:1.3,color:C.yellow},heroTitle:{fontSize:22,fontWeight:'900',color:C.white,marginTop:8},heroSub:{fontSize:12,color:'#D9F4F1',marginTop:7},heroActions:{flexDirection:'row',gap:10,marginTop:17},yellowBtn:{flex:1,backgroundColor:C.yellow,borderRadius:13,paddingVertical:13,alignItems:'center'},whiteBtn:{flex:1,backgroundColor:C.white,borderRadius:13,paddingVertical:13,alignItems:'center'},darkBtnText:{color:C.dark,fontWeight:'800',fontSize:12},section:{fontSize:17,fontWeight:'900',color:C.dark,marginBottom:12,marginTop:4},grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:11,marginBottom:20},tile:{width:'48%',minHeight:150,backgroundColor:C.white,borderRadius:20,padding:15,borderWidth:1,borderColor:'#F1F0E8'},iconCircle:{width:43,height:43,borderRadius:14,backgroundColor:C.paleTeal,alignItems:'center',justifyContent:'center'},tileTitle:{fontSize:14,fontWeight:'900',color:C.dark,marginTop:11},tileSub:{fontSize:11,lineHeight:16,color:C.muted,marginTop:4,flex:1},suggestion:{backgroundColor:C.white,borderRadius:22,padding:18,marginBottom:20},suggestionTop:{flexDirection:'row',alignItems:'center',gap:12},suggestionTitle:{fontSize:19,fontWeight:'900',color:C.dark,marginTop:12},suggestionText:{fontSize:12,lineHeight:19,color:C.muted,marginTop:7},tealBtn:{backgroundColor:C.deepTeal,borderRadius:13,padding:14,alignItems:'center',marginTop:14},lightBtnText:{fontSize:13,fontWeight:'800',color:C.white},coach:{backgroundColor:C.paleTeal,borderRadius:22,padding:18,marginBottom:20},coachTitle:{fontSize:18,fontWeight:'900',color:C.dark},coachBtn:{backgroundColor:C.white,borderRadius:12,padding:13,alignItems:'center',marginTop:12},statRow:{flexDirection:'row',gap:10,marginBottom:18},stat:{flex:1,backgroundColor:C.white,padding:16,borderRadius:17},statNum:{fontSize:23,fontWeight:'900',color:C.deepTeal},statLabel:{fontSize:11,color:C.muted,marginTop:3},connect:{flexDirection:'row',alignItems:'center',gap:10,padding:14,backgroundColor:C.paleTeal,borderRadius:14},connectText:{color:C.deepTeal,fontWeight:'800',fontSize:12},footer:{textAlign:'center',fontSize:11,color:C.muted,marginTop:23},overlay:{flex:1,backgroundColor:'rgba(15,40,40,.45)',justifyContent:'flex-end'},modal:{backgroundColor:C.cream,borderTopLeftRadius:26,borderTopRightRadius:26,padding:22,paddingBottom:32,maxHeight:'90%'},modalTitle:{fontSize:21,fontWeight:'900',color:C.dark},modalSub:{fontSize:12,color:C.muted,lineHeight:19,marginTop:7},input:{backgroundColor:C.white,borderColor:C.paleTeal,borderWidth:1,borderRadius:14,padding:14,fontSize:14,color:C.dark,minHeight:90,textAlignVertical:'top',marginTop:15},counter:{fontSize:11,color:C.muted,textAlign:'right',marginTop:4},cancel:{padding:14,alignItems:'center'},cancelText:{fontWeight:'700',color:C.muted},chips:{gap:7,marginTop:12},chip:{backgroundColor:C.paleTeal,borderRadius:12,padding:10},chipText:{fontSize:12,color:C.dark},floatingCoach:{position:'absolute',right:18,bottom:90,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:C.deepTeal,borderRadius:30,paddingHorizontal:18,paddingVertical:14,elevation:7,shadowColor:'#164F52',shadowOpacity:0.22,shadowRadius:10,shadowOffset:{width:0,height:4},zIndex:10},floatingCoachPressed:{opacity:0.82,transform:[{scale:0.97}]},floatingCoachText:{color:C.white,fontSize:13,fontWeight:'800'}});

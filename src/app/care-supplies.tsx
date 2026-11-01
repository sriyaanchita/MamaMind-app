import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { getMyFamily } from '@/utils/familyService';

const C = { yellow:'#FFDA57', teal:'#19B7B0', deepTeal:'#0E7C86', white:'#FFFFFF', coral:'#FF6B6B', cream:'#FFF9E8', paleTeal:'#E8F8F6', dark:'#164F52', muted:'#648384' };
type Supply = { id:string; name:string; quantity:number; threshold:number; unit:string; category:string };
const categories = ['Diapers', 'Feeding', 'Hygiene', 'Clothing', 'Other'];
const units = ['pcs', 'packs', 'bottles', 'boxes'];
export default function CareSupplies() {
  const router = useRouter();
  const [familyId,setFamilyId] = useState('');
  const [items,setItems] = useState<Supply[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [saving,setSaving] = useState(false);
  const [visible,setVisible] = useState(false);
  const [editing,setEditing] = useState<string|null>(null);
  const [name,setName] = useState('');
  const [quantity,setQuantity] = useState('');
  const [threshold,setThreshold] = useState('');
  const [unit,setUnit] = useState('pcs');
  const [category,setCategory] = useState('Diapers');
  useEffect(() => {
    let active = true;
    let unsubscribe:undefined|(()=>void);
    (async () => {
      try {
        const family = await getMyFamily();
        if (!family?.familyId) { if(active){setError('Connect with Mama first to share supplies.');setLoading(false);} return; }
        if (!active) return;
        setFamilyId(family.familyId);
        unsubscribe = onSnapshot(collection(db,'families',family.familyId,'careSupplies'), snap => {
          setItems(snap.docs.map(d => {
            const x=d.data();
            return {id:d.id,name:String(x.name||''),quantity:Number(x.quantity)||0,threshold:Number(x.threshold)||0,unit:String(x.unit||'pcs'),category:String(x.category||'Other')};
          }).sort((a,b)=>a.name.localeCompare(b.name)));
          setLoading(false);setError('');
        }, e => {setError('Could not load supplies: '+e.message);setLoading(false);});
      } catch(e:any) {if(active){setError(e?.message||'Could not load family.');setLoading(false);}}
    })();
    return () => {active=false;unsubscribe?.();};
  }, []);
  const low = useMemo(()=>items.filter(x=>x.quantity<=x.threshold),[items]);
  const reset = () => {setEditing(null);setName('');setQuantity('');setThreshold('');setUnit('pcs');setCategory('Diapers');};
  const openAdd = () => {reset();setVisible(true);};
  const openEdit = (item:Supply) => {setEditing(item.id);setName(item.name);setQuantity(String(item.quantity));setThreshold(String(item.threshold));setUnit(item.unit);setCategory(item.category);setVisible(true);};
  const save = async () => {
    const q=Number(quantity),t=Number(threshold);
    if(!name.trim() || !quantity.trim() || !threshold.trim() || !Number.isSafeInteger(q) || !Number.isSafeInteger(t) || q<0 || t<0 || name.trim().length>80){Alert.alert('Check details','Enter a name (up to 80 characters) and non-negative whole numbers for quantity and low-stock level.');return;}
    if(!familyId)return Alert.alert('Not connected','Please connect your family first.');
    setSaving(true);
    try {
      const data={name:name.trim(),quantity:q,threshold:t,unit,category,updatedAt:serverTimestamp()};
      if(editing)await updateDoc(doc(db,'families',familyId,'careSupplies',editing),data);
      else await addDoc(collection(db,'families',familyId,'careSupplies'),{...data,createdAt:serverTimestamp()});
      setVisible(false);reset();
    } catch(e:any){Alert.alert('Save failed',e?.message||'Please try again.');}
    finally{setSaving(false);}
  };
  const changeQuantity = async (item:Supply,delta:number) => {
    if(!familyId)return;
    try{await updateDoc(doc(db,'families',familyId,'careSupplies',item.id),{quantity:Math.max(0,item.quantity+delta),updatedAt:serverTimestamp()});}
    catch(e:any){Alert.alert('Update failed',e?.message||'Please try again.');}
  };
  const remove = (item:Supply) => Alert.alert('Delete supply?',`Remove ${item.name} from the tracker?`,[
    {text:'Cancel',style:'cancel'},
    {text:'Delete',style:'destructive',onPress:async()=>{try{await deleteDoc(doc(db,'families',familyId,'careSupplies',item.id));}catch(e:any){Alert.alert('Delete failed',e?.message||'Please try again.');}}}
  ]);
  return <SafeAreaView style={styles.safe}><StatusBar barStyle="dark-content" backgroundColor={C.cream}/>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={C.deepTeal}/><Text style={styles.backText}>Dad's Space</Text></Pressable>
      <Text style={styles.eyebrow}>FAMILY ESSENTIALS</Text>
      <Text style={styles.title}>Care Supplies <Text style={{color:C.deepTeal}}>Tracker</Text></Text>
      <Text style={styles.subtitle}>Stay ready for little everyday needs, together.</Text>
      <View style={styles.hero}><View style={{flex:1}}><Text style={styles.heroTitle}>Keep the essentials ready</Text><Text style={styles.heroSub}>Add items and choose when you want a low-stock reminder.</Text></View><Ionicons name="cube-outline" size={35} color={C.dark}/></View>
      <View style={styles.summary}><View style={styles.summaryCard}><Text style={styles.number}>{items.length}</Text><Text style={styles.small}>Tracked items</Text></View><View style={[styles.summaryCard,{backgroundColor:'#FFE9E5'}]}><Text style={[styles.number,{color:C.coral}]}>{low.length}</Text><Text style={styles.small}>Need restocking</Text></View></View>
      <View style={styles.sectionRow}><Text style={styles.section}>Your supplies</Text><Pressable onPress={openAdd} disabled={!familyId} style={[styles.addButton,!familyId&&{opacity:.5}]}><Ionicons name="add" size={18} color={C.white}/><Text style={styles.addText}>Add item</Text></Pressable></View>
      {loading?<ActivityIndicator color={C.deepTeal} size="large" style={{marginTop:24}}/>:null}
      {error?<View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable onPress={()=>router.push('/connect-family')}><Text style={styles.link}>Family connection →</Text></Pressable></View>:null}
      {!loading&&!error&&items.length===0?<View style={styles.empty}><Ionicons name="basket-outline" size={34} color={C.deepTeal}/><Text style={styles.emptyTitle}>No supplies yet</Text><Text style={styles.small}>Tap Add item to start tracking diapers, wipes, and more.</Text></View>:null}
      {items.map(item=><View key={item.id} style={styles.item}>
        <View style={styles.itemHeader}><View style={{flex:1}}><Text style={styles.itemTitle}>{item.name}</Text><Text style={styles.small}>{item.category} · {item.unit} · Alert at {item.threshold} or fewer</Text></View><Pressable onPress={()=>openEdit(item)} accessibilityLabel={`Edit ${item.name}`} style={styles.iconBtn}><Ionicons name="create-outline" size={20} color={C.deepTeal}/></Pressable><Pressable onPress={()=>remove(item)} accessibilityLabel={`Delete ${item.name}`} style={styles.iconBtn}><Ionicons name="trash-outline" size={19} color={C.coral}/></Pressable></View>
        <View style={styles.itemFooter}><View style={[styles.status,{backgroundColor:item.quantity<=item.threshold?'#FFE9E5':C.paleTeal}]}><Text style={{color:item.quantity<=item.threshold?C.coral:C.deepTeal,fontWeight:'800',fontSize:11}}>{item.quantity<=item.threshold?'Low stock':'In stock'}</Text></View><View style={styles.counter}><Pressable onPress={()=>changeQuantity(item,-1)} style={styles.step}><Ionicons name="remove" size={20} color={C.dark}/></Pressable><Text style={styles.qty}>{item.quantity}</Text><Pressable onPress={()=>changeQuantity(item,1)} style={styles.step}><Ionicons name="add" size={20} color={C.dark}/></Pressable></View></View>
      </View>)}
      <Text style={[styles.section,{marginTop:23}]}>Shopping list</Text>
      <View style={styles.shopping}>{low.length?low.map(x=><View key={x.id} style={styles.shoppingRow}><Ionicons name="checkbox-outline" size={20} color={C.coral}/><Text style={styles.shoppingText}>{x.name} <Text style={{color:C.muted}}>({x.quantity} {x.unit} left)</Text></Text></View>):<Text style={styles.small}>All tracked items are above their low-stock levels. 💛</Text>}</View>
      <Text style={styles.footer}>Your shopping list updates automatically from quantities you enter.</Text>
    </ScrollView>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={()=>setVisible(false)}><View style={styles.overlay}><View style={styles.modal}><ScrollView keyboardShouldPersistTaps="handled"><Text style={styles.modalTitle}>{editing?'Edit supply':'Add a care supply'}</Text><Text style={styles.small}>Name</Text><TextInput value={name} onChangeText={setName} maxLength={80} placeholder="e.g. Diapers" placeholderTextColor={C.muted} style={styles.input}/><Text style={styles.small}>Quantity</Text><TextInput value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="e.g. 24" placeholderTextColor={C.muted} style={styles.input}/><Text style={styles.small}>Low-stock alert at</Text><TextInput value={threshold} onChangeText={setThreshold} keyboardType="number-pad" placeholder="e.g. 10" placeholderTextColor={C.muted} style={styles.input}/><Text style={styles.small}>Unit</Text><View style={styles.chips}>{units.map(x=><Pressable key={x} onPress={()=>setUnit(x)} style={[styles.chip,unit===x&&styles.selected]}><Text style={[styles.chipText,unit===x&&styles.selectedText]}>{x}</Text></Pressable>)}</View><Text style={styles.small}>Category</Text><View style={styles.chips}>{categories.map(x=><Pressable key={x} onPress={()=>setCategory(x)} style={[styles.chip,category===x&&styles.selected]}><Text style={[styles.chipText,category===x&&styles.selectedText]}>{x}</Text></Pressable>)}</View><Pressable onPress={save} disabled={saving} style={[styles.save,saving&&{opacity:.6}]}>{saving?<ActivityIndicator color={C.white}/>:<Text style={styles.saveText}>{editing?'Save changes':'Add supply'}</Text>}</Pressable><Pressable onPress={()=>setVisible(false)} style={styles.cancel}><Text style={{color:C.muted,fontWeight:'700'}}>Cancel</Text></Pressable></ScrollView></View></View></Modal>
  </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:C.cream},content:{padding:18,paddingBottom:40},back:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:20},backText:{color:C.deepTeal,fontWeight:'800'},eyebrow:{color:C.deepTeal,fontWeight:'900',fontSize:10,letterSpacing:1.5},title:{fontSize:29,fontWeight:'900',color:C.dark,marginTop:7},subtitle:{fontSize:12,color:C.muted,marginTop:7,marginBottom:19},hero:{backgroundColor:C.yellow,borderRadius:22,padding:20,flexDirection:'row',alignItems:'center',gap:10},heroTitle:{fontSize:18,fontWeight:'900',color:C.dark},heroSub:{fontSize:12,color:C.dark,lineHeight:18,marginTop:8},summary:{flexDirection:'row',gap:10,marginVertical:19},summaryCard:{flex:1,backgroundColor:C.white,borderRadius:17,padding:16},number:{fontSize:25,fontWeight:'900',color:C.deepTeal},small:{fontSize:12,color:C.muted,lineHeight:18},sectionRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:13},section:{fontSize:18,fontWeight:'900',color:C.dark},addButton:{backgroundColor:C.deepTeal,flexDirection:'row',alignItems:'center',gap:5,borderRadius:12,paddingHorizontal:13,paddingVertical:10},addText:{color:C.white,fontWeight:'800',fontSize:12},item:{backgroundColor:C.white,borderRadius:18,padding:15,marginBottom:11},itemHeader:{flexDirection:'row',alignItems:'center',gap:7},itemTitle:{fontSize:15,fontWeight:'900',color:C.dark,marginBottom:3},iconBtn:{padding:5},itemFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:14},status:{paddingVertical:7,paddingHorizontal:10,borderRadius:10},counter:{flexDirection:'row',alignItems:'center',gap:15},step:{backgroundColor:C.paleTeal,padding:7,borderRadius:9},qty:{fontSize:17,fontWeight:'900',color:C.dark,minWidth:25,textAlign:'center'},shopping:{backgroundColor:C.white,borderRadius:18,padding:16,marginTop:12},shoppingRow:{flexDirection:'row',alignItems:'center',gap:9,paddingVertical:7},shoppingText:{color:C.dark,fontSize:13,fontWeight:'700',flex:1},footer:{fontSize:11,color:C.muted,textAlign:'center',marginTop:19},empty:{alignItems:'center',padding:25,backgroundColor:C.white,borderRadius:18,gap:9},emptyTitle:{fontSize:16,fontWeight:'900',color:C.dark},error:{padding:15,backgroundColor:'#FFE9E5',borderRadius:12,marginBottom:14},errorText:{color:C.dark,fontSize:12},link:{color:C.deepTeal,fontWeight:'800',marginTop:8},overlay:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(20,45,45,.45)'},modal:{backgroundColor:C.cream,borderTopLeftRadius:25,borderTopRightRadius:25,padding:22,maxHeight:'88%'},modalTitle:{fontSize:21,fontWeight:'900',color:C.dark,marginBottom:15},input:{backgroundColor:C.white,borderWidth:1,borderColor:C.paleTeal,borderRadius:12,padding:12,color:C.dark,fontSize:14,marginTop:7,marginBottom:15},chips:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:9,marginBottom:16},chip:{paddingVertical:8,paddingHorizontal:12,backgroundColor:C.white,borderRadius:10,borderWidth:1,borderColor:C.paleTeal},selected:{backgroundColor:C.deepTeal,borderColor:C.deepTeal},chipText:{fontSize:12,color:C.dark},selectedText:{color:C.white,fontWeight:'800'},save:{backgroundColor:C.deepTeal,borderRadius:13,padding:15,alignItems:'center',marginTop:8},saveText:{color:C.white,fontWeight:'900'},cancel:{alignItems:'center',padding:15}});

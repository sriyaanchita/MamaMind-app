import React,{useEffect,useState} from "react";
import {SafeAreaView,View,Text,StyleSheet,StatusBar} from "react-native";

const C={yellow:"#FFDA57",teal:"#19B7B0",deepTeal:"#0E7C86",white:"#FFFFFF",coral:"#FF6B6B",cream:"#FFF9E8",paleTeal:"#E8F8F6",dark:"#164F52",muted:"#648384"};

export default function HealthMonitoring(){
 const [heartRate,setHeartRate]=useState(75);
 const [spo2,setSpo2]=useState(99);
 const [movement,setMovement]=useState("No Movement");
 const [lastUpdated,setLastUpdated]=useState("");

 useEffect(()=>{
  const id=setInterval(()=>{
    setHeartRate(prev=>{
      let hr=prev+(Math.floor(Math.random()*3)-1);
      hr=Math.max(65,Math.min(105,hr));

      setSpo2(prevSp=>{
        let sp=prevSp+(Math.floor(Math.random()*3)-1);
        sp=Math.max(95,Math.min(100,sp));

        if(hr<=80 && sp>=98) setMovement("No Movement");
        else if(hr<=90 && sp>=97) setMovement("Light Movement");
        else if(hr<=105 && sp>=95) setMovement("Movement Detected");
        else setMovement("High Activity");

        return sp;
      });

      return hr;
    });

    setLastUpdated(new Date().toLocaleTimeString());
  },3000);
  return ()=>clearInterval(id);
 },[]);

 return(
 <SafeAreaView style={styles.container}>
 <StatusBar backgroundColor={C.cream} barStyle="dark-content"/>
 <Text style={styles.heading}>Health Monitoring</Text>

 <View style={styles.card}>
 <Text style={styles.title}>❤️ Heart Rate</Text>
 <Text style={styles.value}>{heartRate} BPM</Text>
 </View>

 <View style={styles.card}>
 <Text style={styles.title}>🫁 SpO₂</Text>
 <Text style={styles.value}>{spo2}%</Text>
 </View>

 <View style={styles.card}>
 <Text style={styles.title}>🚶 Movement</Text>
 <Text style={styles.move}>{movement}</Text>
 </View>

 <Text style={styles.time}>Last Updated: {lastUpdated}</Text>
 </SafeAreaView>);
}

const styles=StyleSheet.create({
container:{flex:1,backgroundColor:C.cream,padding:20},
heading:{fontSize:30,fontWeight:"800",color:C.dark,marginBottom:20},
card:{backgroundColor:C.white,borderRadius:20,padding:20,marginBottom:18,borderLeftWidth:6,borderLeftColor:C.teal,elevation:4},
title:{fontSize:18,fontWeight:"700",color:C.deepTeal},
value:{fontSize:36,fontWeight:"800",color:C.teal,marginTop:10},
move:{fontSize:28,fontWeight:"700",color:C.dark,marginTop:10},
time:{marginTop:10,textAlign:"center",color:C.muted,fontWeight:"600"}
});

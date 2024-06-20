import { StyleSheet, Text, View,Pressable } from 'react-native'
import React from 'react'
import { Avatar } from 'react-native-paper';

type setStateType = (value: boolean) => void;
interface AppBarProp{
    setProfileModalVisible:setStateType
}

const AppBar: React.FC<AppBarProp> = ({setProfileModalVisible}) => {
  return (
    <View style={styles.AppBar}>
    <Text style={styles.AppNameText}>Spendify</Text>
    <Pressable onPress={() => { setProfileModalVisible(true) }}>
      <Avatar.Image size={40} source={require('../../assets/images/batman.png')} />
    </Pressable>
  </View>
  )
}

export default AppBar;

const styles = StyleSheet.create({
    AppNameText:{
        fontFamily:'Roboto',
        color:'white',
        fontSize:34,
        fontWeight:'600',
        letterSpacing:1,
      },
      AppBar:{
        flex:1,
        flexDirection:'row',
        maxHeight:'8%',
        alignItems:'center',
        justifyContent:'space-between',
        padding:8
      },
})
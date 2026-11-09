import React, { useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, Pressable, View, useWindowDimensions } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { FLEET, SIZE, emptyBoard, freshFleetState, placeShip, randomFleet, fireAt } from './src/game';

const C = { bg: '#071827', panel: '#0D2538', panel2: '#102D43', line: '#214257', ink: '#F2F8FC', muted: '#8BA8BB', cyan: '#35D6E8', aqua: '#9AEEF2', red: '#FF6F61', gold: '#F5C66B', sea: '#0A3149' };
const letters = 'ABCDEFGHIJ'.split('');

function Cell({ value, shot, enemy, size, onPress, pulse }) {
  const hit = shot && !!value;
  const style = [styles.cell, { width: size, height: size }, value && !enemy && !shot && styles.shipCell, shot && !hit && styles.missCell, hit && styles.hitCell];
  return <Pressable onPress={onPress} style={style}>
    {hit ? <Animated.Text style={[styles.hitGlyph, pulse && { transform: [{ scale: pulse }] }]}>{'✹'}</Animated.Text> : shot ? <View style={styles.missDot} /> : value && !enemy ? <View style={styles.shipMark} /> : null}
  </Pressable>;
}

function Board({ state, hidden = false, onFire, cellSize, pulse }) {
  const boardWidth = cellSize * SIZE;
  return <View style={{ width: boardWidth + 20 }}>
    <View style={styles.colLabels}><View style={{ width: 20 }} />{letters.map(l => <Text key={l} style={[styles.axisText, { width: cellSize }]}>{l}</Text>)}</View>
    <View style={styles.gridRow}>
      <View style={styles.rowLabels}>{Array.from({ length: SIZE }, (_, i) => <Text key={i} style={[styles.axisText, { height: cellSize }]}>{i + 1}</Text>)}</View>
      <View style={[styles.grid, { width: boardWidth }]}>{state.board.map((row, r) => row.map((v, c) => <Cell key={`${r}-${c}`} value={v} shot={state.shots[r][c]} enemy={hidden} size={cellSize} pulse={pulse} onPress={() => onFire?.(r, c)} />))}</View>
    </View>
  </View>;
}

export default function App() {
  return <SafeAreaProvider><GameScreen /></SafeAreaProvider>;
}

function GameScreen() {
  const { width } = useWindowDimensions();
  const cell = Math.max(22, Math.min(34, Math.floor((width - 84) / 10)));
  const [phase, setPhase] = useState('setup');
  const [vertical, setVertical] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [placed, setPlaced] = useState([]);
  const [playerBoard, setPlayerBoard] = useState(emptyBoard());
  const [enemy, setEnemy] = useState(null);
  const [player, setPlayer] = useState(null);
  const [note, setNote] = useState('Ubica tu flota para iniciar la misión.');
  const [busy, setBusy] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const nextShip = FLEET[placed.length];
  const remaining = state => state?.ships.filter(s => s.hits < s.length).length || 0;

  const newGame = () => { setPlayerBoard(emptyBoard()); setPlaced([]); setPlayer(null); setEnemy(null); setPhase('setup'); setAnchor(null); setVertical(false); setBusy(false); setNote('Ubica tu flota para iniciar la misión.'); };
  const placeAt = (r,c) => {
    if (!nextShip) return;
    const start = anchor || [r,c];
    const result = placeShip(playerBoard, nextShip, start[0], start[1], vertical);
    if (!result) { setAnchor([r,c]); setNote('Esa posición no cabe. Prueba otra casilla o gira el barco.'); return; }
    setPlayerBoard(result.board); setPlaced([...placed, result.ship]); setAnchor(null);
    setNote(placed.length + 1 === FLEET.length ? 'Flota lista. Pulsa «Iniciar combate».': `${nextShip.name} desplegado. Siguiente: ${FLEET[placed.length + 1].name}.`);
  };
  const startBattle = () => { setEnemy(freshFleetState()); setPlayer({ board: playerBoard, ships: placed, shots: Array.from({length:SIZE},()=>Array(SIZE).fill(false)), over:false }); setPhase('battle'); setNote('Tu turno. Elige una casilla enemiga.'); };
  const shoot = (r,c) => {
    if (busy || phase !== 'battle' || enemy.shots[r][c]) return;
    const nextEnemy = fireAt(enemy,r,c); setEnemy(nextEnemy);
    Animated.sequence([Animated.spring(scale,{toValue:1.35,useNativeDriver:true}),Animated.spring(scale,{toValue:1,useNativeDriver:true})]).start();
    const resultText = nextEnemy.last.hit ? (nextEnemy.last.sunk ? `¡Hundiste el ${nextEnemy.last.sunk}!` : '¡Impacto confirmado!') : 'Agua. El disparo cayó al mar.';
    setNote(resultText);
    if (nextEnemy.over) { setPhase('won'); setNote('¡Victoria! La flota enemiga ha sido destruida.'); return; }
    setBusy(true);
    setTimeout(() => {
      const options=[]; for(let rr=0;rr<SIZE;rr++) for(let cc=0;cc<SIZE;cc++) if(!player.shots[rr][cc]) options.push([rr,cc]);
      if (!options.length) { setBusy(false); return; }
      const [ar,ac]=options[Math.floor(Math.random()*options.length)];
      const shotPlayer = { ...player, shots: player.shots.map(line=>[...line]) }; shotPlayer.shots[ar][ac]=true;
      const shipId=player.board[ar][ac];
      shotPlayer.ships=player.ships.map(s=>s.id===shipId?{...s,hits:s.hits+1}:s);
      shotPlayer.over=shotPlayer.ships.every(s=>s.hits===s.length);
      const sunk=shotPlayer.ships.find(s=>s.id===shipId&&s.hits===s.length);
      setPlayer(shotPlayer); setBusy(false);
      const enemyText=shipId?(sunk?`La computadora hundió tu ${sunk.name}.`:'La computadora acertó en tu flota.'):'La computadora disparó al agua.';
      setNote(shotPlayer.over?'Tu flota ha sido destruida. La misión terminó.':`${enemyText} Tu turno.`);
      if (shotPlayer.over) setPhase('lost');
    }, 850);
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
    <ExpoStatusBar style="light" backgroundColor={C.bg} translucent={false} />
    <ScrollView style={styles.scroll} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never">
      <View style={styles.topline}><View style={styles.logo}><Text style={styles.logoGlyph}>⚓</Text></View><View style={{flex:1}}><Text style={styles.eyebrow}>COMANDO NAVAL · PACÍFICO</Text><Text style={styles.title}>HUNDIR LA FLOTA</Text></View><View style={styles.live}><View style={styles.liveDot}/><Text style={styles.liveText}>{phase==='battle'?'EN CURSO':'LISTO'}</Text></View></View>
      <View style={styles.hero}><View><Text style={styles.heroLabel}>{phase==='setup'?'MODO CAMPAÑA · 01':'OPERACIÓN · PACÍFICO'}</Text><Text style={styles.heroTitle}>{phase==='setup'?'Prepara tu flota':phase==='won'?'Misión cumplida':phase==='lost'?'Misión finalizada':'Combate naval'}</Text></View><Text style={styles.heroIcon}>⌁</Text></View>
      <View style={styles.stats}><Stat value={phase==='setup'?`${placed.length}/5`:remaining(player)} label="TU FLOTA"/><View style={styles.statDivider}/><Stat value={phase==='setup'?'—':remaining(enemy)} label="RIVAL"/><View style={styles.statDivider}/><Stat value={phase==='battle'?`${enemy?.shots.flat().filter(Boolean).length || 0}`:'10×10'} label={phase==='battle'?'DISPAROS':'TABLERO'}/></View>
      <View style={styles.panel}>
        <View style={styles.sectionHead}><View><Text style={styles.sectionKicker}>{phase==='setup'?'FASE 01 · DESPLIEGUE':'RADAR · SECTOR ENEMIGO'}</Text><Text style={styles.sectionTitle}>{phase==='setup'?'Tu zona de operaciones':'Objetivo enemigo'}</Text></View><View style={styles.badge}><Text style={styles.badgeText}>{phase==='setup'?'ALIADO':'HOSTIL'}</Text></View></View>
        <View style={styles.boardWrap}><Board state={phase==='setup'?{board:playerBoard,shots:Array.from({length:SIZE},()=>Array(SIZE).fill(false))}:enemy} hidden={phase==='battle'||phase==='won'||phase==='lost'} onFire={phase==='setup'?placeAt:shoot} cellSize={cell} pulse={scale}/></View>
        <View style={styles.legend}><Legend color={C.aqua} label="Tu flota"/><Legend color={C.red} label="Impacto"/><Legend color={C.muted} label="Agua"/></View>
      </View>
      {phase!=='setup'&&<View style={styles.panel}>
        <View style={styles.sectionHead}><View><Text style={styles.sectionKicker}>RADAR · SECTOR ALIADO</Text><Text style={styles.sectionTitle}>Tu flota</Text></View><View style={[styles.badge,{backgroundColor:'#123A43'}]}><Text style={styles.badgeText}>ALIADO</Text></View></View>
        <View style={styles.boardWrap}><Board state={player} cellSize={cell}/></View>
        <View style={styles.legend}><Legend color={C.aqua} label="Tu flota"/><Legend color={C.red} label="Impacto"/><Legend color={C.muted} label="Agua"/></View>
      </View>}
      <View style={styles.panel}>
        <View style={styles.sectionHead}><View><Text style={styles.sectionKicker}>{phase==='setup'?'ORDEN DE BATALLA':'ESTADO DE MISIÓN'}</Text><Text style={styles.sectionTitle}>{phase==='setup'?'Flota disponible':'Reporte de combate'}</Text></View><Text style={styles.shipCount}>{phase==='setup'?`${placed.length} / 5`:`${remaining(player)} · ${remaining(enemy)}`}</Text></View>
        {phase==='setup' ? <>
          <View style={styles.shipList}>{FLEET.map((ship,i)=>{const done=i<placed.length, active=i===placed.length;return <View key={ship.id} style={[styles.shipRow,active&&styles.activeShip,done&&styles.doneShip]}><View style={[styles.shipIcon,done&&{borderColor:C.aqua}]}><Text style={{color:done?C.aqua:C.muted,fontSize:16}}>▰</Text></View><View style={{flex:1}}><Text style={styles.shipName}>{ship.name}</Text><Text style={styles.shipSub}>{ship.length} casillas · {done?'Desplegado':active?'Listo para desplegar':'En espera'}</Text></View><View style={styles.shipBoxes}>{Array.from({length:ship.length},(_,k)=><View key={k} style={[styles.miniCell,done&&styles.miniCellDone]}/>)}</View></View>})}</View>
          <Text style={styles.instruction}>{nextShip?`Selecciona dónde colocar: ${nextShip.name}`:'Toda la flota está en posición.'}</Text>
          <View style={styles.controls}><Pressable style={styles.secondaryBtn} onPress={()=>{setVertical(!vertical);setAnchor(null)}}><Text style={styles.btnGlyph}>{vertical?'↕':'↔'}</Text><Text style={styles.secondaryText}>{vertical?'Vertical':'Horizontal'}</Text></Pressable><Pressable style={[styles.primaryBtn,placed.length!==5&&styles.disabledBtn]} disabled={placed.length!==5} onPress={startBattle}><Text style={styles.primaryText}>Iniciar combate</Text><Text style={styles.primaryArrow}>→</Text></Pressable></View>
        </> : <>
          <View style={styles.report}><View style={[styles.reportIcon,(phase==='won'||phase==='lost')&&{backgroundColor:'rgba(245,198,107,0.12)'}]}><Text style={styles.reportGlyph}>{phase==='won'?'★':phase==='lost'?'✕':busy?'⌁':'⌖'}</Text></View><View style={{flex:1}}><Text style={styles.reportTitle}>{busy?'Turno enemigo…':phase==='won'?'Victoria naval':phase==='lost'?'Fin de la misión':enemy?.last?.hit?'Impacto registrado':enemy?.last?'Disparo al agua':'En espera'}</Text><Text style={styles.reportText}>{note}</Text></View></View>
          {phase==='battle'&&<View style={styles.bars}><FleetBar title="TU FLOTA" ships={player.ships}/><FleetBar title="FLOTA ENEMIGA" ships={enemy.ships}/></View>}
          {phase!=='battle'&&<Pressable style={styles.primaryBtn} onPress={newGame}><Text style={styles.primaryText}>↻　Nueva partida</Text><Text style={styles.primaryArrow}>→</Text></Pressable>}
        </>}
      </View>
      <Text style={styles.footer}>⟡ 　EL MAR NO PERDONA ERRORES</Text>
    </ScrollView>
  </SafeAreaView>;
}

function Stat({value,label}){return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>}
function Legend({color,label}){return <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:color}]}/><Text style={styles.legendText}>{label}</Text></View>}
function FleetBar({title,ships}){return <View style={styles.fleetBar}><View style={styles.fleetHead}><Text style={styles.fleetTitle}>{title}</Text><Text style={styles.fleetNum}>{ships.filter(s=>s.hits<s.length).length}/{ships.length}</Text></View><View style={styles.fleetLine}>{ships.map(s=><View key={s.id} style={styles.fleetShip}><Text style={styles.fleetShipName}>{s.name}</Text><View style={styles.shipBoxes}>{s.cells.map((_,i)=><View key={i} style={[styles.miniCell,(i<s.hits)&&styles.miniCellHit]}/>)}</View></View>)}</View></View>}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg},scroll:{flex:1},page:{paddingHorizontal:18,paddingTop:16,paddingBottom:16,maxWidth:600,width:'100%',alignSelf:'center'},topline:{flexDirection:'row',alignItems:'center',gap:11,marginBottom:20},logo:{width:42,height:42,borderRadius:13,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center'},logoGlyph:{color:C.cyan,fontSize:22},eyebrow:{color:C.muted,fontSize:9,fontWeight:'800',letterSpacing:1.7},title:{color:C.ink,fontSize:16,fontWeight:'900',letterSpacing:1.2,marginTop:2},live:{borderColor:C.line,borderWidth:1,borderRadius:20,paddingHorizontal:9,paddingVertical:6,flexDirection:'row',alignItems:'center',gap:6},liveDot:{width:6,height:6,borderRadius:4,backgroundColor:C.cyan},liveText:{color:C.aqua,fontSize:8,fontWeight:'900',letterSpacing:1},hero:{backgroundColor:'#10344A',borderRadius:17,padding:17,marginBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',overflow:'hidden',borderWidth:1,borderColor:'#19455D'},heroLabel:{color:C.cyan,fontSize:9,letterSpacing:1.7,fontWeight:'800'},heroTitle:{color:C.ink,fontSize:22,fontWeight:'900',marginTop:5},heroIcon:{fontSize:54,color:'#1C5366',fontWeight:'200'},stats:{borderRadius:14,backgroundColor:C.panel,paddingVertical:13,paddingHorizontal:8,marginBottom:13,flexDirection:'row',alignItems:'center',justifyContent:'space-around',borderWidth:1,borderColor:C.line},stat:{alignItems:'center',flex:1},statValue:{fontSize:18,fontWeight:'900',color:C.ink},statLabel:{fontSize:8,color:C.muted,letterSpacing:1,fontWeight:'800',marginTop:4},statDivider:{height:27,width:1,backgroundColor:C.line},panel:{borderRadius:16,backgroundColor:C.panel,padding:13,marginBottom:12,borderWidth:1,borderColor:C.line},sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:13},sectionKicker:{fontSize:8,color:C.cyan,fontWeight:'900',letterSpacing:1.45},sectionTitle:{fontSize:15,color:C.ink,fontWeight:'800',marginTop:4},badge:{borderRadius:6,paddingHorizontal:8,paddingVertical:5,backgroundColor:'#143A4C'},badgeText:{fontSize:8,color:C.aqua,fontWeight:'900',letterSpacing:1},boardWrap:{alignItems:'center',paddingVertical:8},colLabels:{flexDirection:'row',alignItems:'center',marginBottom:3},axisText:{color:'#68869A',textAlign:'center',fontSize:8,fontWeight:'700',textAlignVertical:'center'},gridRow:{flexDirection:'row'},rowLabels:{width:20,justifyContent:'space-around'},grid:{flexDirection:'row',flexWrap:'wrap',backgroundColor:'#0A3047',borderTopWidth:1,borderLeftWidth:1,borderColor:'#275169'},cell:{backgroundColor:C.sea,borderBottomWidth:1,borderRightWidth:1,borderColor:'#21465A',alignItems:'center',justifyContent:'center'},shipCell:{backgroundColor:'#24657A'},shipMark:{width:'65%',height:'56%',borderRadius:3,backgroundColor:C.aqua,opacity:.84},missCell:{backgroundColor:'#0A263A'},missDot:{width:4,height:4,borderRadius:3,backgroundColor:'#7591A1'},hitCell:{backgroundColor:'#632D39'},hitGlyph:{fontSize:18,color:'#FFB07E',fontWeight:'900'},legend:{flexDirection:'row',justifyContent:'center',gap:20,marginTop:10},legendItem:{flexDirection:'row',alignItems:'center',gap:6},legendDot:{width:7,height:7,borderRadius:4},legendText:{fontSize:9,color:C.muted},shipCount:{color:C.aqua,fontWeight:'900',fontSize:11},shipList:{gap:6},shipRow:{flexDirection:'row',alignItems:'center',padding:8,borderRadius:10,backgroundColor:'#0A2031',borderWidth:1,borderColor:'transparent'},activeShip:{backgroundColor:'#103248',borderColor:'#28647A'},doneShip:{opacity:.68},shipIcon:{width:30,height:30,borderRadius:8,borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center',marginRight:9},shipName:{color:C.ink,fontSize:11,fontWeight:'800'},shipSub:{color:C.muted,fontSize:9,marginTop:2},shipBoxes:{flexDirection:'row',gap:3},miniCell:{width:9,height:9,borderRadius:2,backgroundColor:'#326075'},miniCellDone:{backgroundColor:C.aqua},instruction:{color:C.muted,fontSize:10,marginTop:12,marginBottom:9},controls:{flexDirection:'row',gap:8},secondaryBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:10,minHeight:44},btnGlyph:{color:C.cyan,fontSize:18},secondaryText:{color:C.ink,fontSize:10,fontWeight:'800'},primaryBtn:{flex:1,minHeight:44,borderRadius:10,backgroundColor:C.cyan,alignItems:'center',justifyContent:'center',flexDirection:'row',paddingHorizontal:12},disabledBtn:{backgroundColor:'#1D4356'},primaryText:{color:'#062033',fontSize:11,fontWeight:'900'},primaryArrow:{color:'#062033',fontWeight:'900',marginLeft:10,fontSize:16},report:{flexDirection:'row',alignItems:'center',gap:11,backgroundColor:'#0A2031',borderRadius:12,padding:12,marginBottom:12},reportIcon:{width:38,height:38,borderRadius:11,backgroundColor:'rgba(53,214,232,.12)',alignItems:'center',justifyContent:'center'},reportGlyph:{fontSize:21,color:C.cyan},reportTitle:{color:C.ink,fontSize:12,fontWeight:'800'},reportText:{color:C.muted,fontSize:10,marginTop:4},bars:{gap:10},fleetBar:{padding:9,borderRadius:10,backgroundColor:'#0A2031'},fleetHead:{flexDirection:'row',justifyContent:'space-between',marginBottom:7},fleetTitle:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:1},fleetNum:{fontSize:9,color:C.aqua,fontWeight:'900'},fleetLine:{gap:5},fleetShip:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},fleetShipName:{fontSize:9,color:'#C6D7E1'},miniCellHit:{backgroundColor:C.red},footer:{textAlign:'center',color:'#547286',letterSpacing:1.4,fontSize:8,fontWeight:'800',paddingTop:8}});

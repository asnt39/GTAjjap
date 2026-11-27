// Dedicated destinations on existing pavements, public rooms, and the pier.
export const districtPoints={
 'watch.gate':{x:8.45,z:26.6}, 'watch.quay':{x:8.9,z:-14.5,look:1.3},
 'market.buyer':{x:-53.65,z:-44.1}, 'market.usher':{x:-63.1,z:-44.1},
 'clock.reader':{x:-46.8,z:53.5}, 'clock.visitor':{x:-29.02,z:44.4}, 'clock.break':{x:-50.7,z:55.3},
 'west.delivery':{x:-116.55,z:63.8}, 'west.planter':{x:-165.25,z:44.7}, 'west.ferry':{x:-210.1,z:101.4},
 'basin.steps':{x:23.6,z:151.85}, 'basin.south-seat':{x:16.8,z:196.9,look:2.2},
 'coast.turn':{x:24.8,z:146.5}, 'coast.gate':{x:33,z:146.5}, 'coast.boardwalk':{x:45,z:146.5},
 'coast.apron':{x:60.4,z:146.5}, 'coast.pier':{x:74.8,z:146.5,look:1.4},
 'coast.fishing':{x:93.2,z:146.5,look:2.2}, 'coast.north':{x:51.2,z:143.5},
 'coast.rest':{x:54.4,z:157.8,look:1.4}, 'coast.hut':{x:53.5,z:170.2,look:-1.4},
 'coast.dunes':{x:57.3,z:184.4,look:1.25}
}
export const districtLinks=[
 ['eastSouth','watch.gate','eastGateMeet'],['quayWalk','watch.quay','quaySupplies'],
 ['marketMiddle','market.buyer','promenade'],['marketMiddle','market.usher','marketStand'],
 ['clockSouth','clock.reader','clockFront'],['clockSidewalk','clock.visitor','lanternDoor'],
 ['clockBench','clock.break','clockSouth'],
 ['westLane','west.delivery','westSteps'],['gardenWalk','west.planter','gardenNorth'],['ferryDoor','west.ferry','ferryDesk'],
 ['basin.wharf','basin.steps','basin.coastal-rest'],['basin.garden','basin.south-seat'],
 ['basin.steps','coast.turn','coast.gate','coast.boardwalk','coast.apron','coast.pier','coast.fishing'],
 ['coast.boardwalk','coast.north','coast.apron'],['coast.boardwalk','coast.rest','coast.hut','coast.dunes']
]

const roles=[
 ['dock-shift','Samira Lane','하역 교대 인원','watch.gate','eastSouth','eastGateMeet','정문을 확인하고 교대하러 가요.'],
 ['dock-surveyor','Milo Hart','안벽 점검원','watch.quay','quaySupplies','quayWalk','부두 쪽 난간부터 확인할 거예요.'],
 ['market-buyer','Hana West','장 보는 주민','market.buyer','provisionsApron','promenade','배 시간 전에 식료품을 좀 사야 해요.'],
 ['market-host','Reuben Mills','시장 안내원','market.usher','marketStand','marketMiddle','가게들은 저쪽 산책로에도 있어요.'],
 ['clock-reader','Sophie Ames','도서관 방문객','clock.reader','clockSouth','clockFront','다 읽은 책은 광장 건너편에 돌려줘요.'],
 ['clock-guest','Arlo Singh','카페 손님','clock.visitor','clockSidewalk','lanternDoor','모퉁이 카페는 창가가 좋아요.'],
 ['clock-local','Nadia Moss','시계탑 인근 주민','clock.break','clockBench','clock.reader','해 지기 전에 광장을 한 바퀴 돌아요.'],
 ['west-runner','Tessa Doyle','서편 배달 기사','west.delivery','westMail','parcelApron','오래된 우체국에 소포를 가져다주려고요.'],
 ['west-planter','Kian Rice','정원 자원봉사자','west.planter','gardenGate','gardenNorth','화단은 저녁이 되면 물을 줘야 해요.'],
 ['west-passenger','Sara Wells','선착장 방문객','west.ferry','ferryDoor','ferrySignal','오늘은 강 건너편 풍경을 보러 왔어요.'],
 ['basin-walker','Julian Park','남부 안벽 주민','basin.steps','basin.coastal-rest','basin.wharf','해안 쪽을 걷고 나면 다리가 풀려요.'],
 ['basin-runner','Eva Benton','정원 산책객','basin.south-seat','basin.garden','basin.garden-turn','정원에 돌아오면 여기서 한숨 돌려요.'],
 ['coast-visitor','Mina Ford','해변 산책객','coast.north','coast.boardwalk','coast.apron','선착장 끝까지 걸어가 보려고요.'],
 ['coast-guard','Amir Cole','해안 안전요원','coast.hut','coast.rest','coast.dunes','바위 주변에서는 물살을 조심하세요.'],
 ['coast-angler','Eli Stone','낚시객','coast.fishing','coast.pier','coast.apron','물때가 바뀌기 전에 다시 와볼게요.'],
 ['coast-friend','Yuna Blake','해안 방문객','coast.rest','coast.dunes','coast.boardwalk','바람이 좀 잦아들면 친구가 올 거예요.']
]
export const districtCitizens=roles.map(([id,name,role,start,,,line],i)=>({
 id,name,role,...districtPoints[start],variant:[2,7,4,6,1,5][i%6],
 pace:.88+(i%5)*.087,temper:i%4?'avoid':'flee',spawnWait:.7+(i%7)*.81,lines:[line]
}))
export const districtRounds=Object.fromEntries(roles.map(([id,,,start,visit,last],i)=>[
 id,[[visit,4.5+i%4,'visit'],[last,3+i%3,'check'],[start,7+i%5,'rest']]
]))

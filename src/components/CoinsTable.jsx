import { Container, createTheme, LinearProgress, makeStyles, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, ThemeProvider, Typography } from '@material-ui/core'
import axios from 'axios'
import React, { useState, useEffect } from 'react'
import { useHistory, useLocation } from 'react-router'
import { CoinList } from '../config/api'
import { CryptoState } from '../CryptoContext'
import { numberWithCommas } from './Banner/Carousel'
import Trend from 'react-trend';
import { Pagination } from '@material-ui/lab'


const useStyles = makeStyles(() => ({
  row: {
    backgroundColor: "#16171a",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#131111",
    },
    fontFamily: "Montserrat",
  },
  pagination: {
    "& .MuiPaginationItem-root": {
      color: "gold",
    },
  },
}))

const CoinsTable = () => {

  const { search } = useLocation()
 
  const history = useHistory()

  const [coins, setCoins] = useState([])
  const [searchs, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const classes = useStyles()

  const { currency, symbol, sort, setLoad, hour, load, setHour, setCurrency, setSort } = CryptoState()
  
  useEffect(() => {
    const fetchCoins = async () => {
     
      setLoad(true)
      setCoins([])
      const { data } = await axios.get(CoinList(currency, page, sort, hour))
      setCoins(data)
     
      setLoad(false)
    }

    fetchCoins()
  }, [currency, page, sort, setLoad, hour]);

  useEffect(() => {
    let sp = new URLSearchParams(search)

    let pageNum = sp.get("number") === null ? "1" : sp.get("number")
    let sortBy = sp.get("sort_by") === null ? "market_cap_desc" : sp.get("sort_by")
    let curr = sp.get("currency") === null ? "USD" : sp.get("currency")
    let period = sp.get("time_period") === null ? "24h" : sp.get("time_period")

    const fetchCoins = async (num, srt, curr) => {
    
      setLoad(true)
      setCoins([])

      setHour(period)
      setCurrency(curr)
      setSort(sortBy)
      setPage(pageNum)

      const { data } = await axios.get(CoinList(curr, num, srt, period))
      setCoins(data)
      
      setLoad(false)
    }

     fetchCoins(pageNum, sortBy, curr, period)

    return () => {
      setCoins([])
      
    }
  
  }, [search, setLoad, setHour, setCurrency, setPage, setSort]);

  const darkTheme = createTheme({
    palette: {
      primary: {
        main: "#fff"
      },
      type: "dark"
    }
  })

  let headlines = ["#","Coin", "Price", "24h %", "Market Cap", "7D Chart", "Volume", "ATH & ATL"]

  const handleSearch = () => {
    return coins.filter((coin) => (
      coin.name.toLowerCase().includes(searchs) || 
      coin.symbol.toLowerCase().includes(searchs) 
    ))
  }

  const CoinRow = ({coin}) => {
    const [price, setPrice] = useState(numberWithCommas(coin?.current_price));
    const [percentageDaily, setPercentageDaily] = useState(parseFloat(coin?.price_change_percentage_24h).toFixed(2));
    const [percentageDailyColor, setPercentageDailyColor] = useState(parseFloat(coin?.price_change_percentage_24h).toFixed(2) < 0 ? "#FA0A32": "#16c784");
    const [color, setColor] = useState("#fff");
    const [icon, setIcon] = useState(parseFloat(coin?.price_change_percentage_24h).toFixed(2) < 0 ? "▼" : "▲");

   useEffect(() => {

    let wsCurrency = currency === "USD" ? "usdt" : currency.toLowerCase();
    let wss = `wss://stream.binance.com:9443/ws/${coin.symbol}${wsCurrency}@ticker`;
    let ws = new WebSocket(wss);

     try {

        let wsPrice = null;
        let wsPercentage = null;

        ws.onclose = () => {
            ws = new WebSocket(wss);
        }

        ws.onerror = () => {
            ws = new WebSocket(wss);
        }
        
        ws.onmessage = (event) => {
            let data = JSON.parse(event?.data);
            let priceDef = data?.a > 1000 ? parseFloat(data?.a).toFixed(0) : data?.a < 1000 ? parseFloat(data?.a).toFixed(3) : parseFloat(data?.a).toFixed(6);
            let percentage = parseFloat(data?.P).toFixed(2);
            let wsColor = !wsPrice || wsPrice === priceDef ? "white" : wsPercentage > percentage ? "#FA0A32" : "#16c784" ;
            let percentageColor = wsPercentage > percentage ? "#FA0A32" : "#16c784"
  
            setPercentageDailyColor(percentageColor)
            setColor(wsColor)
            setPercentageDaily(percentage)
            setPrice(numberWithCommas(priceDef))
            setIcon(wsPercentage > percentage ? "▼" : "▲")
  
           if (wsColor !== "white") {
              setTimeout(() => {
                  setColor("white")
              }, 1000);
           }
      
            wsPrice = priceDef;
            wsPercentage = percentage;
          }
     } catch(error) {
         console.log(error);
         if (ws.readyState === WebSocket.OPEN) {
             ws.close()
         }
         setTimeout(() => {
          ws = new WebSocket(wss);
         }, 1500);

     }

    return () => {
            setPrice(0);
            setPercentageDaily(0);
            setPercentageDailyColor(0);
            setColor("#fff");
            setIcon("▲");
           if (ws.readyState === WebSocket.OPEN) {
                ws.close()
           }
       }
      
   }, [coin.symbol]);

    let chart = []
    
    if (coin?.sparkline_in_7d?.price) {           
      coin?.sparkline_in_7d?.price.forEach((set, index) => {         
          let count = parseFloat((set).toFixed(2))
          chart.push(count)         
      })
    }

    if (!coin) {
      return (<></>);
    }

    return (
      <TableRow key={coin?.name} hover={true} onClick={() => {history.push(`/coins/${coin?.id}`)}}  className={classes.row}>
          <TableCell align='left' >
             # {coin?.market_cap_rank}
          </TableCell>
          <TableCell  align='left' scope="row" style={{
            display: "flex",
            height:70,
            justifyContent:"flex-start",
            alignItems:"center"
          }}>
             <img src={coin?.image} alt={coin?.name} height="28" loading='lazy' style={{
              
               borderRadius: 10,
               marginRight:10
             }} />
             <div style={{display:"flex", flexDirection:"column", justifyContent:"flex-start", alignItems:"flex-start"}}>
                  <span style={{fontSize: 16, textTransform:"uppercase", whiteSpace:"nowrap", overflow:"hidden", maxWidth: 100, textOverflow:"ellipsis"}}>{coin?.symbol}</span>
                  <span style={{color: "darkgray", fontSize: 12, whiteSpace:"nowrap", overflow:"hidden", maxWidth: 100, textOverflow:"ellipsis"}}>{coin?.name}</span>
             </div>
          </TableCell>
          <TableCell align='left' style={{color: color, fontWeight: 600}}>
              {symbol} {" "}
              {price}
          </TableCell>
          <TableCell align='center' style={{
             color: percentageDailyColor,
             fontWeight: 600
          }}>
           {icon} {coin.price_change_percentage_24h ? percentageDaily : "N/A"} %
          </TableCell>
          <TableCell align='left'>
            {symbol} {" "}
            {numberWithCommas(coin?.market_cap.toString().slice(0, -6))} M
          </TableCell>
          <TableCell align="left">
          {
            chart.length > 0 ? (

              <Trend data={chart} width={135} height={45} stroke={percentageDailyColor} autoDrawEasing="ease-in"   />
            ) : (<LinearProgress style={{backgroundColor:"gold"}} />)
          }
          </TableCell>
          <TableCell align='left'>
            <div style={{display: "flex",flexDirection:"column"}}>
               <span>{symbol} {numberWithCommas(coin?.total_volume?.toString().slice(0, -6))} M</span>
               <span style={{color: "darkgray", fontSize: 12, whiteSpace:"nowrap", overflow:"hidden", maxWidth: 100, textOverflow:"ellipsis"}}>{coin.total_volume  ? numberWithCommas(((coin?.total_volume / coin?.current_price).toFixed(2)).toString().slice(0, -6)) + " M " : "N/A"} {coin?.symbol.toUpperCase()}</span>
            </div>
        
          </TableCell>
          <TableCell align='left'>
            <div style={{display: "flex",flexDirection:"column"}}>
               <span style={{color:"#16c784", whiteSpace:"nowrap", overflow:"hidden", maxWidth: 100, textOverflow:"ellipsis"}}>▲ {symbol} {coin.ath ? parseFloat(numberWithCommas(coin?.ath)).toFixed(3) : "N/A"}</span>
               <span style={{color:"#FA0A32", whiteSpace:"nowrap", overflow:"hidden", maxWidth: 100, textOverflow:"ellipsis"}}>▼ {symbol} {coin.atl ? parseFloat( numberWithCommas(coin?.atl)).toFixed(3) : "N/A"}</span>
            </div>
        
          </TableCell>      
      </TableRow>
    )
  }
 
  return (
    <React.Fragment>
      <ThemeProvider theme={darkTheme}>
         <Container style={{ textAlign: "center" }}>

           <Typography
             variant='h4'
             style={{ margin:18, fontFamily: "Montserrat" }}
           >
             Today's Cryptocurrency Prices by Market Cap
           </Typography>
           <TextField 
              variant="outlined"
              label="Search For a Cryptocurrency..."
              style={{ marginBottom: 20, width:"80%" }}
              onChange={(e) => {setSearch(e.target.value)}}
           />
           <TableContainer>
             {
               load ? (
                    <LinearProgress style={{backgroundColor:"gold" }} />
               ) : (
                 <Table>
                   <TableHead style={{backgroundColor: "#EEBC1D"}}>
                      <TableRow>
                         {headlines.map((headline) => (
                           <TableCell style={{
                              color: "black",
                              fontWeight: 700,
                              fontFamily: "Montserrat"
                           }} key={headline}>
                             {headline}
                           </TableCell>
                         ))}
                      </TableRow>
                   </TableHead>
                   <TableBody>
                     {handleSearch().map((coin) => (<CoinRow coin={coin} key={coin.id} />))}
                   </TableBody>
                 </Table>
               )
             }
           </TableContainer>
          <Pagination count={412}  onChange={(_, value) => {
            setPage(value);
            let sp = new URLSearchParams()
            

            let q = new URLSearchParams(search)

            let currencyQ = q.get("currency")

            
            sp.set("sort_by", q.get("sort_by") === null ? "market_cap_desc" : q.get("sort_by"))
            sp.set("number", value)
            sp.set("currency", currencyQ === null ? "USD" : currencyQ)
            sp.set("time_period", q.get("time_period") === null ? "24h" : q.get("time_period")) 

            history.push({
              pathname:"/page",
              search:"?" + sp
            })
           window.scroll(0, 450);
          }}
           style={{
             padding: 20,
             width:"100%",
             display:"flex",
             justifyContent:"center"
           }}
           classes={{ul: classes.pagination}}
          />
         </Container>
      </ThemeProvider>
    </React.Fragment>
  )
}

export default CoinsTable
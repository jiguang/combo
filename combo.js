/**
 * @desc CSS Combo 工具，自动生成时间戳文件，用于新网购 /static/qqbuy 和 /static/v5 下面的样式文件
 * @author laserji
 * @mail jiguang1984#gmail.com
 * @date 2013-05-15
 */

$(function(){

    // 基本变量
    var
        isDebug = false, // 是否调试模式
        fileList,  // 拆分后的样式文件列表
        updateList,  // 待更新的样式文件列表
        ssiFileName, // 时间戳文件名
        timer, // 全局计时器
        api = 'http://ppms.midea.com/combo/combo_ssi.php', // 后台接口
        combo_str = '//st.midea.com/??', // combo 服务固定字串
        staticPath = '//st.midea.com', // 静态资源地址
        storage = $.localStorage(), // 本地存储对象
        isEditMode = false, // 是否 直接编辑 模式
        isCreateMode = true, // 是否 创建 模式
        ssiExtName = '.html', // SSI 扩展名
        RECENT_COMBO_LIST = 'r_cb_list', // 本地存储键值（最近combo文件列表）
        FSO_LIST = 'fso_list', // 本地存储键值（快速发布文件列表）

        regLinkTag = /<link[^>]*?>/ig,  // 匹配link标签
        regLink = /(\/\/[^'"]*?)(?=['"])/ig, // 匹配单个 link 中的地址
        regComboLink = /.*?(\/\/[^'"]*?)['"][\s\S]*/ig,// 匹配 combo 后代码中的地址，例：http://st.midea.com/??/pc/common/global.css,/pc/detail/detail.css?t=1380507170
        regTimestamp = /\?t=.*$/ig; // 匹配时间戳格式

    // DOM 绑定
    var
        $codeContainer = $('#code'),             // 代码 输入框
        $btnCreate = $('#btn_create'),           // 创建 按钮
        $btnUpdate = $('#btn_update'),           // 更新 按钮
        $btnSwitch = $('#btn_switch'),           // 环境切换 按钮（切换 qqbuy 和 v5 目录）
        $btnCopy = $('#btn_copy'),               // 复制 按钮（复制生成后的时间戳文件引用代码）
        $checkListWrap = $('#checkListWrap'),    // 待更新文件列表 容器
        $checkList = $('#checkList'),            // 待更新文件列表
        $recentFiles = $('#rencentFiles'),       // 近期操作文件列表
        $fileName = $('#fileName'),              // 时间戳文件名 输入框
        $filePath = $('#filePath'),              // 生成后的时间戳文件引用代码
        $tip = $('#tip'),                        // 提示信息
        $clearRecent = $('#clearRecent'),        // 清空近期操作列表
        $edit_wrap = $('#edit_wrap'),            // 编辑按钮 容器
        $btnTestCombo = $('#test_combo'),        // 测试 combo 链接
        $btnEditMode = $('#edit_mode'),          // 开启编辑模式 按钮
        $btnSaveChange = $('#save_change'),      // 保存更改 按钮
        $btnFso = $('#btn_fso'),                 // 快速发布按钮
        $btnFsoBeta = $('#btn_fso_beta'),        // 快速发布到beta
        $fsoList = $('#fso_list'),               // 快速发布列表
        $updateList = $('#updateList');          // 显示已更新的文件列表

    var envArray = ['pc', 'h5'];
    var envIndex = 0;
        
    // 初始化
    init();

    // 初始化操作
    function init(){

        // 欢迎
        // tip('欢迎使用 ECD COMBO 工具 ^_^ <a href="http://km.oa.com/group/d9/docs/show/119560" target="_blank">新人请先看使用教程</a>', 3000);

        // 生成近期操作文件列表
        generateRecentFileList();
        // 刷新时复位代码框
        $codeContainer.removeAttr('disabled').val('');

        // 初始化开发环境图标
        initDevIcon();

        /******************** 事件绑定 ********************/

        // 根据代码中是否包含文件名确定操作
        $codeContainer.on('keyup', function(){
            var code = $(this).val();
            validateCode(code);

            // 反斜线转换
            $(this).val(code.replace('\\','/'));

            for(var i = 0, j = envArray.length; i<j; i++){
                if(code.indexOf(envArray[i]) !=-1){
                    $btnSwitch.removeClass(envArray.join(' ')).addClass(envArray[i]);
                }
            }

            var fileName = getSSIFileName($(this).val());

            if(isComboFile()){
                stateSwitch('update', {
                    fileName: fileName,
                    comboStr: $(this).val()
                });
            }else if(isCreateMode){
                stateSwitch('create', {
                    fileName: fileName,
                    comboStr: $(this).val()
                });
            }
        });

        // 解析从 chrome 扩展过来的链接
        var url = document.URL,
            index = url.indexOf('=');

        if(index != -1){
            $codeContainer.val(decodeURIComponent(url.substr(index+1, url.length -1)))
                .trigger('keyup');
        }

        // 拍拍网购场景切换
        $btnSwitch.click(function(e){
            e.preventDefault();

            if(!$(this).hasClass('dis')){

                for(var i = 0, j = envArray.length; i<j; i++){
                    if($(this).hasClass(envArray[i])){
                        envIndex = i;
                    }
                }
                envIndex++;
                if(envIndex == envArray.length){ envIndex = 0; }

                $(this).removeClass(envArray[envIndex]);
                setDevIconState(envArray[envIndex]);
            }
        });

        // 创建新的时间戳文件
        $btnCreate.click(function(e){
            e.preventDefault();

            var fileName = $.trim($fileName.val());

            var txt = $(this).html();
            $(this).attr('disabled', 'disabled');
            var count = 2;
            var blink = setInterval(function(){
                if(count <5){
                    $btnUpdate.html('操作中' + (new Array(count).join('.')));
                    count++;
                }else{
                    count = 2;
                }
            }, 500);

            if(fileName == ''){
                tip('文件名不能为空，请填写文件名。');
            }else{
                if(fileName.indexOf(ssiExtName) < 0){
                    fileName += ssiExtName;
                }

                tip('正在为您创建文件，请稍后...');

                $.post(api, {
                    "fileName": fileName,
                    "devPath" : getDevPath(),
                    "comboStr": getComboString($codeContainer.val())
                }, function(data){

                    data = JSON ? JSON.parse(data) : eval('('+data+')');

                    if(data.status == 1){
                        // 成功
                        tip('文件创建成功，请将地址嵌入DEMO页面。');

                        successCallback(data.url);

                        stateSwitch('copy', {
                            ssi: '<!--#include virtual="'+data.url+'" -->'
                        });

                        $btnCreate.html(txt).removeAttr('disabled');
                        clearInterval(blink);

                        isCreateMode = false;

                    }else if(data.status == 0){
                        tip('CSS文件或SSI目录不存在，请检查。');
                    }
                });
            }
        });

        // 更新全部关联文件 警告
        $('#updateAll').click(function(){
            if(this.checked) tip('注意：所有相关的文件将被重新压缩合并，请慎用！');
        });

        // 更新时间戳文件
        $btnUpdate.click(function(e){
            e.preventDefault();

            var txt = $(this).html();
            $(this).attr('disabled', 'disabled');

            var count = 2;
            var blink = setInterval(function(){
                if(count <5){
                    $btnUpdate.html('操作中' + (new Array(count).join('.')));
                    count++;
                }else{
                    count = 2;
                }
            }, 500);

            var fileName = getSSIFileName($codeContainer.val());

            // 是否更新全部相关文件
            var isAll = $('#updateAll')[0].checked ? 1 : 0;

            tip('正在为您更新文件，请稍后...');

            $.post(api, {
                "fileName": fileName,
                "devPath" : getDevPath(),
                "comboStr": getComboString($codeContainer.val()),
                "updateList": getUpdateList().toString(),
                "updateAll": isAll
            }, function(data){

                data = JSON ? JSON.parse(data) : eval('('+data+')');

                if(data.status == 1){
                    tip('更新成功！');
                    // 成功
                    successCallback(data.url);
                }else if(data.status == 0){
                    tip('文件不存在，请检查。');
                }

                $btnUpdate.html(txt).removeAttr('disabled');
                clearInterval(blink);
            });

        });

        // 开启直接编辑代码的模式
        $btnEditMode.click(function(){
            getEditMode()?setEditMode(false):setEditMode(true);
        });

        // 保存修改
        $btnSaveChange.click(function(){

            if($codeContainer.val() != '' && getEditMode()){

                var fileName = $fileName.val();

                $.post(api, {
                    "edit": "edit",
                    "fileName": fileName,
                    "devPath" : getDevPath(),
                    "comboStr": getComboString($codeContainer.val())
                }, function(data){

                    setEditMode(false);

                    data = JSON ? JSON.parse(data) : eval('('+data+')');

                    if(data.status == 1){
                        tip('保存成功');

                        // 成功则切换为非编辑模式
                        setEditMode(false);

                        var path = '/sinclude/cssi/'+getDevPath()+'/'+fileName.replace(/^|/ig,'');

                        getSSIFileContent(path, function(content){
                            stateSwitch('update', {
                                ssi: path
                            });
                            $fileName.val(getSSIFileNameByPath(path));
                            $codeContainer.val(content);

                            saveRecentFile();
                            generateRecentFileList();
                        });

                    }else if(data.status == 0){
                        tip('保存失败');
                        // 失败再显示
                        setEditMode(true);
                    }

                });
            }
        });

        // 全部选中
        $('#checkAll').click(function(){
            var isChecked = this.checked;
            $checkList.find('input').each(function(){
                this.checked = isChecked;
            });
        });

        // 清空近期记录
        $clearRecent.click(function(){
            if(window.confirm('确定清空全部操作记录（清空后不可恢复）？')){
                if(storage.getItem(RECENT_COMBO_LIST)){
                    storage.setItem(RECENT_COMBO_LIST, '');
                    generateRecentFileList();
                }
            }
        });

        // 快速发布 2014-11-20
        $btnFso.click(function(e){
            e.preventDefault();
            tip('发布中请稍后...');
            $btnUpdate.attr('disabled', 'disabled');
            $btnCopy.attr('disabled', 'disabled');
            var filelist = storage.getItem(FSO_LIST);
            $.post('http://ppms.midea.com/combo/fso_fast.php', {
                filename: filelist,
                env: 'idc'
            }, function(){
                tip('发布成功！');
                $btnUpdate.removeAttr('disabled');
                $btnCopy.removeAttr('disabled');
            });
        });
        $btnFsoBeta.click(function(e){
            e.preventDefault();
            tip('发布中请稍后...');
            $btnUpdate.attr('disabled', 'disabled');
            $btnCopy.attr('disabled', 'disabled');
            var filelist = storage.getItem(FSO_LIST);
            $.post('http://ppms.midea.com/combo/fso_fast.php', {
                filename: filelist,
                env: 'beta'
            }, function(){
                tip('发布成功！');
                $btnUpdate.removeAttr('disabled');
                $btnCopy.removeAttr('disabled');
            });
        });

        // 复制代码
        var copySSI = new ZeroClipboard( document.getElementById("btn_copy"), {
            moviePath: "http://ppms.midea.com/js/ZeroClipboard.swf"
        } );

        var copyUpdateList = new ZeroClipboard( document.getElementById("btn_copy_update_list"), {
            moviePath: "http://ppms.midea.com/js/ZeroClipboard.swf"
        } );

        copySSI.on( 'complete', function(){
            tip('已复制时间戳路径到剪贴板！');
        });
        copyUpdateList.on( 'complete', function(){
            tip('已复制文件列表到剪贴板！');
        });

        // 【代码编辑】复制末尾的link
        $('#btnCloneLastLink').click(function(){
            var code = $codeContainer.val();
            var links = code.match(regLinkTag);

            if(!/[\r\n]$/.test(code)){
                code += '\r\n';
            }

            if(links && links[0]){
                $codeContainer.val(code + links[links.length - 1]);
            }
        });

        // 【代码编辑】删除末尾的link
        $('#btnRemoveLastLink').click(function(){
            var code = $codeContainer.val();
            var links = code.match(regLinkTag);

            if(links && links[0]){
                if(links.length == 1){
                    tip('留个活口吧哥们儿~');
                }else{
                    $codeContainer.val(links.slice(0, -1).join('\r\n'));
                }
            }
        });

        // 查找近期操作列表
        $('#keyword').keyup(function(e){
            var $input = $(this);
            findRecentFile($input.val(), function($recentLi){
                if(e.keyCode === 13){ // 回车时触发近期文件列表的点击事件
                    $recentLi.click();
                    $input.val('');
                }
            });
        });
    }

    // 切换手动编辑模式
    function setEditMode(isEditMode){

        if(isEditMode){
            $codeContainer[0].disabled = false;
            window.tempCode = $codeContainer.val();
            $('.edit_btn_wrap').show();
            $btnEditMode.html('取消');
            window.isEditMode = true;

            // 切换代码为单独的link形式
            $codeContainer.val(getLinks( $codeContainer.val()));
        }else{
            $codeContainer[0].disabled = true;
            $codeContainer.val(window.tempCode);
            $('.edit_btn_wrap').hide();
            $btnEditMode.html('编辑');
            window.isEditMode = false;
        }
    }

    // 获取手动编辑模式状态
    function getEditMode(){
        return window.isEditMode;
    }

    // 创建成功之后回调，显示已更新的列表
    function successCallback(url){

        var updateList = getUpdateList();

        if(url.indexOf(',') < 0){
            updateList.push(url);
        }else{
            updateList = updateList.concat(url.split(','));
        }

        for(var i = 0, j = updateList.length; i < j; i++){
            updateList[i] = 'static' + updateList[i];
            console.log(updateList[i])
        }

        var d = new Date();
        var time = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate() + ' ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds();
        $updateList.find('h3').remove().end().show()
            .prepend('<h3>-------- ['+ updateList.length +'] files modified at '+ time +' -------- </h3>');
        $fsoList.html(updateList.join('\r\n<br>'));

        // 为快速发布存储键值，在PPMS中再取，由于返回状态不好确定，以及OA登录等问题，故该按钮只带参打开URL
        storage.setItem(FSO_LIST, updateList.join('|'));

        saveRecentFile();
        generateRecentFileList();
    }

    // 获取开发路径
    function getDevPath(){
        for(var i = 0, j = envArray.length; i<j; i++){
            if($btnSwitch.hasClass(envArray[i])){
                return envArray[i];
            }
        }
       return '';
    }

    // 初始化开发环境图标
    function initDevIcon(){
        var devPath = storage.getItem('devPath');
        if(devPath){
            $btnSwitch.removeClass(envArray.join(' ')).addClass(''+devPath);
        }
    }

    // 设置开发环境图标状态
    function setDevIconState(path){
        $btnSwitch.removeClass(envArray.join(' ')).addClass(path);
        storage.setItem('devPath', path);
    }

    // 根据时间戳路径切换开发路径icon状态
    function switchDevIcon(ssiPath){
        var path = '';
        for(var i = 0, j = envArray.length; i<j; i++){
            path = envArray[i];
            if(ssiPath.indexOf(path) != -1){
                setDevIconState(path);
            }
        }
    }

    // 检查代码合法性
    function validateCode(source_code){
        // 木有 link
        if(source_code.indexOf('link') < 0){
            tip('代码中不包含&lt;link&gt;标签，请检查');
        }
    }

    // 是否为combo后的文件
    function isComboFile(){
        return $codeContainer.val().indexOf('combofile') != -1;
    }

    // 通过代码获取时间戳文件名
    function getSSIFileName(source_code){
        // combo 过的取 combofile 名
        var reg = new RegExp('combofile="(.*?'+ssiExtName+')"');
        // 未combo 的取【最后】一个文件名作为建议名
        var reg_single = /css[\/](.*?)\.css/ig;

        return source_code.match(reg)
            ? source_code.match(reg)[1] : source_code.match(reg_single)
            ? source_code.match(reg_single)[source_code.match(reg_single).length -1]
            .replace('css/','') // 用 css/ 来判断 css 文件名的开始
            .replace(/\..*/i,'') : ""; // 去掉第一个点后的所有内容
    }

    // 通过文件路径获取时间戳文件名
    function getSSIFileNameByPath(filePath){
        var reg = new RegExp('.*?'+getDevPath()+'\/(.*?'+ssiExtName+')$', 'i');
        return filePath.replace(reg, '$1');
    }

    // 获取代码中的全部链接地址
    function getFileList(source_code){

        // 过滤掉 <!--#include virtual='xxx.html' -->
        var reg = /<!--\s?#include[^>]*?>[\r\t\n]*/ig;
        if(reg.test(source_code)){
            source_code = source_code.replace(reg, '');
        }


        // 处理 combo 后的地址
        if(source_code.indexOf('??') > -1){
            fileList = source_code.replace(regComboLink, '$1')
                .replace(combo_str, '')
                .split(',');

        }else{
            fileList = source_code.match(regLink);
        }


        if(fileList && fileList[0]){
            for(var i = 0, j = fileList.length; i<j; i++){
                fileList[i] = fileList[i]
                    .replace(staticPath, '')
                    .replace(regLink, "$1")
                    .replace(regTimestamp, '');
            }
        }

        isDebug && console.log('[COMBO DEBUG] 代码中的全部链接地址：', fileList.join('|||||'));
        return fileList || [];
    }

    // 获取代码中的全部链接
    function getLinks(source_code){
        var file_list = getFileList(source_code),
            code = '';

        if(file_list.length != 0){
            for(var i = 0, j = file_list.length; i<j; i++){
                code += '<link rel="stylesheet" href="'+ staticPath + file_list[i]+'" />\n';
            }
        }
        return code;
    }

    // 获取需要更新的文件列表
    function getUpdateList(){
        updateList = [];

        var $item;
        $checkList.find('li').each(function(){
            $item = $(this).find('input').eq(0);

            if($item.attr('checked') == 'checked'){
                updateList.push($item.attr('data-path'));
            }
        });
        return updateList;
    }

    // 生成待选择文件列表
    function generateUpdateFileList(){

        // DOM 模板
        var template = '<li class="file_list"><label class="label_file" for="{{id}}"><input type="checkbox" name="" id="{{id}}" data-path="{{path}}"><span class="path">&lt;link rel="stylesheet" href="'+staticPath+'{{path}}" /&gt;</span><a class="url" href="'+staticPath+'{{path}}" target="_blank">OPEN</a></label></li>',
            temp;

        var fileList = getFileList($codeContainer.val());

        if(fileList && fileList.length > 0){
            $checkList.empty();
            $updateList.hide();
            $fsoList.html('');

            for(var i = 0; i < fileList.length; i++){
                isDebug && console.log('[COMBO DEBUG] 待更新列表文件：', i, fileList[i]);
                temp = template.replace(/{{path}}/ig, fileList[i]).replace(/{{id}}/ig, 'id_'+i);
                $(temp).appendTo($checkList);
            }

            // 如果只有一个文件则默认选中
            if(fileList.length == 1){
                $checkList.find(':checkbox').eq(0).attr('checked', 'checked');
            }
        }

    }

    // 获取近期文件列表
    function getRecentFileList(){
        return typeof storage.getItem(RECENT_COMBO_LIST) === 'string' ? storage.getItem(RECENT_COMBO_LIST).split(',') : [];
    }

    // 生成近期操作文件列表
    function generateRecentFileList(){

        var template = '<li><span class="path">{{path}}</span><span class="del">删除</span></li>',
            temp;

        var fileList = getRecentFileList();

        if(fileList.length > 0){
            $recentFiles.empty();
            for(var i = 0; i < fileList.length; i++){
                if($.trim(fileList[i]) !== ''){  // 简单容错
                    temp = template.replace(/{{path}}/ig, fileList[i]);
                    $(temp).prependTo($recentFiles);
                }
            }
        }

        // 显示记录总数
        $('#recentNum').html(fileList.length -1 + ' Record(s)');

        // [事件绑定]获取开发机时间戳文件内容
        $recentFiles.find('li').click(function(){
            setEditMode(false);

            var path = $(this).find('.path').html();

                getSSIFileContent(path, function(content){
                stateSwitch('update', {
                    ssi: path
                });
                $fileName.val(getSSIFileNameByPath(path));
                $codeContainer.val(content);

                generateUpdateFileList();
            });
        });

        $recentFiles.find('.del').click( function(e){
            e.preventDefault();
            if(window.confirm('是否要删除该条本地记录（删除后不可恢复）？')){
                removeRecentFile($(this).siblings('.path').html());
                generateRecentFileList();
            }
            e.stopPropagation();
        });
    }

    // 存储近期文件
    function saveRecentFile(){

        var fileName = $fileName.val().indexOf(ssiExtName) > -1 ? $fileName.val() : $fileName.val() + ssiExtName,
            filePath = '/sinclude/cssi/'+getDevPath()+'/' + fileName,
            originItem = storage.getItem(RECENT_COMBO_LIST),
            originList;

        if(typeof originItem == 'string'){

            // 有记录
            originList = originItem.split(',');

            // 普通青年不会遇到的提示
            if(originList.length > 100){
                alert('So many files, aha~, please clear the record');
            }

            // 如果原记录中有相同的则删除原记录
            if(originItem.indexOf(filePath) > -1){
                for(var i = 0, j = originList.length; i<j; i++){
                    if(originList[i] == filePath){
                        originList.splice(i, 1);
                        // 理论上不会有多个重复的，所以找到即跳出循环
                        break;
                    }
                }
            }

            storage.setItem(RECENT_COMBO_LIST, originList + ',' + filePath);
        }else{
            // 无记录
            storage.setItem(RECENT_COMBO_LIST, filePath);
        }
    }

    // 删除近期操作记录
    function removeRecentFile(path){

        var originItem = storage.getItem(RECENT_COMBO_LIST),
            originList;

        if(typeof originItem == 'string'){

            // 有记录
            originList = originItem.split(',');

            // 先检查是否有记录
            if(originItem.indexOf(path) > -1){

                for(var i = 0, j = originList.length; i<j; i++){
                    if(originList[i] == path){
                        originList.splice(i, 1);
                        // 理论上不会有多个重复的，所以找到即跳出循环
                        break;
                    }
                }
            }

            storage.setItem(RECENT_COMBO_LIST, originList + '');
        }
    }

    // 搜索近期操作记录
    function findRecentFile(keyword, callback){
        if(!keyword) return;
        var $match = $("#rencentFiles li:contains('"+keyword+"')").eq(0);

        if($match[0]){

            $match.addClass('cur').siblings().removeClass('cur');
            // 快速连续输入时位置可能就算不准确
            $('.recent_wrap').scrollTop($match.position().top);

            if(typeof callback == 'function'){
                callback($match);
            }
        }
    }

    // 读取时间戳文件内容
    function getSSIFileContent(filePath, callback){
        if(filePath.indexOf('sinclude') > -1){
            tip('正在获取时间戳文件内容，请稍后...');
            $.get(api + '?ssiFileName=' + filePath.match(/\/sinclude.*/)[0], function(data){

                if($.trim(data) === ''){
                    tip('文件不存在或内容为空，请检查！');
                }else{
                    $codeContainer.val(data);
                    tip('文件读取成功！');
                    $('#ssiFileText').html('&lt;!--#include virtual="'+filePath+'" --&gt;');

                    if(typeof callback == 'function'){
                        callback(data);
                    }
                }
            });
        }
    }

    // 获取 combo 地址
    function getComboString(source_code){

        var ret = combo_str; // 缓存为本地

        // 已经 combo 后的代码
        if(source_code.indexOf('combofile') > -1){

            source_code = source_code.replace(regComboLink, '$1')
                .replace(regTimestamp, '');

            isDebug && console.log('[COMBO DEBUG] 完整的combo地址：', source_code);
            return source_code;
        }

        // 去掉 http 2015-10-29
        source_code = source_code.replace('http:','');

        var links_array = source_code.match(regLink);
        isDebug && console.log('[COMBO DEBUG] 从代码获取的链接地址：', links_array.join('||||'));

        if(links_array && links_array[0]){
            var link = '';

            for(var i = 0, j = links_array.length; i<j; i++){
                link = links_array[i]
                    .replace(staticPath, '')
                    .replace(regLink, '$1')
                    .replace(regTimestamp, '');

                isDebug && console.log('[COMBO DEBUG] 取到的单个链接地址：',i, link);

/*               if(link.indexOf('.min.css') != -1){
                    link = link.replace('.min.css', '.css');
                }*/

                ret += $.trim(link) + ',';
            }
            ret = ret.substring(0, ret.length - 1); // 去掉最后一个逗号

            isDebug && console.log('[COMBO DEBUG] 生成的COMBO地址：', ret);
            return ret;
        }
        return "";
    }

    // 信息
    function tip(tip, delay){
        delay = delay || 2000;
        $tip.hide().html(tip).show().delay(delay).fadeOut(1000);
    }

    // 状态切换
    function stateSwitch(state, data){

        data = data || {};
        data.ssi = data.ssi || '';
        data.fileName = data.fileName || '';

        $('.opt_bar .btn, .opt_bar input, #edit_wrap').hide();
        $btnSwitch.removeClass('dis');
        getEditMode()?$codeContainer.removeAttr('disabled'):$codeContainer.attr('disabled', 'disabled');

        if(state == 'create'){

            isCreateMode = true;

            $fileName.show().val(data.fileName).removeAttr('disabled');
            $checkListWrap.hide();
            $codeContainer.removeAttr('disabled');
            $btnCreate.show();
            $btnSwitch.removeClass('dis');

            ssiFileName = data.fileName;

        }else if(state == 'update'){

            isCreateMode = false;

            getEditMode()?$codeContainer.removeAttr('disabled'):$codeContainer.attr('disabled', 'disabled');
            $fileName.show().attr('disabled', 'disabled');
            $btnUpdate.show();
            $edit_wrap.show();

            // 设置测试combo地址的链接
            $btnTestCombo.attr('href', getComboString($codeContainer.val()));

            data.comboStr = data.comboStr || '';

            // 目录切换
            for(var i = 0, j = envArray.length; i<j; i++){
                if(data.ssi.indexOf('/'+ envArray[i]) != -1 || data.comboStr.indexOf('/'+ envArray[i]) != -1){
                    $btnSwitch.removeClass(envArray.join(' ')).addClass(envArray[i]);
                }
            }

            $btnSwitch.addClass('dis');
            $checkListWrap.show();

            if($.trim($fileName.val()) == ''){
                $fileName.val(data.fileName).attr('disabled', 'disabled');
                ssiFileName = data.fileName;
            }

            clearTimeout(timer);
            timer = setTimeout(function(){
                generateUpdateFileList();
            }, 100);

        }else if(state == 'copy'){
            
            isCreateMode = false;

            $fileName.val('');
            $filePath.show().val(data.ssi);
            $btnSwitch.addClass('dis');
            $btnCopy.show();
        }

        switchDevIcon(data.ssi);
    }

    // 拉取包含图片 2015-11-26
    function get_image_list(){
        $('.image_list').remove();
        $('#checkList').find('input').each(function(){
            var $that = $(this);
            var path = $that.data('path');

            $.post('http://ppms.midea.com/combo/image_list.php', {
                'file': path
            }, function(data){
                data = JSON.parse(data);
                var str = '';
                for(var i = 0, j = data.data.length; i<j; i++){
                    var id = $that.attr('id')+'_'+i;
                    str += '<li><label for="'+id+'"><input id="'+id+'" type="checkbox" data-path="'+data.data[i]+'" /><span class="image_url">'+data.data[i]+'</span><a href="http://st.midea.com'+data.data[i]+'" target="_blank">OPEN</a></label></li>';
                }
                if(!str){
                    str = '-- no pic --';
                }
                $('<ul class="image_list"></ul>').appendTo($that.parents('li')).html(str);
            });

        });
    }

    $('#showImage').on('click', function(){
        get_image_list();
    });
});

